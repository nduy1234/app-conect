import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import { z } from 'zod';
import { toast } from 'sonner';

const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(2000, { message: "Message must be less than 2000 characters" })
});

interface ChatDetailProps {
  partnerId: string;
  partnerName: string;
  onBack: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const ChatDetail: React.FC<ChatDetailProps> = ({ partnerId, partnerName, onBack }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isDemo = !z.string().uuid().safeParse(partnerId).success;
  const [demoMessages, setDemoMessages] = useState<Message[]>([
    {
      id: 'demo-initial',
      sender_id: partnerId,
      receiver_id: 'me',
      content: "It's great to learn more about your startup.",
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      is_read: true,
    }
  ]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', partnerId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', partnerId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      return data as Message[];
    },
    enabled: !isDemo,
  });

  const { data: partnerProfile } = useQuery({
    queryKey: ['profile', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', partnerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !isDemo,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (isDemo) {
        // Demo conversations: do not hit the database
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: partnerId,
          content,
          is_read: false,
        });

      if (error) throw error;
    },
    onMutate: async (content: string) => {
      if (isDemo) {
        // Optimistically add to local demo state
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          sender_id: 'me',
          receiver_id: partnerId,
          content,
          created_at: new Date().toISOString(),
          is_read: true,
        };
        setDemoMessages((prev) => [...prev, optimisticMessage]);
        return { previousMessages: null };
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', partnerId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', partnerId]);

      // Optimistically update with the new message
      if (currentUserId) {
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          sender_id: currentUserId,
          receiver_id: partnerId,
          content,
          created_at: new Date().toISOString(),
          is_read: false,
        };

        queryClient.setQueryData<Message[]>(
          ['messages', partnerId],
          (old) => [...(old || []), optimisticMessage]
        );
      }

      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error for non-demo
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', partnerId], context.previousMessages);
      }
      const errMsg = (err as any)?.message || '';
      if (/invalid input syntax for type uuid/i.test(errMsg)) {
        toast.info("This is a demo conversation. Messages aren't saved.");
        return;
      }
      toast.error('Failed to send message. Please try again.');
    },
    onSuccess: () => {
      if (isDemo) {
        setNewMessage('');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['messages', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage('');
    },
  });
  const displayedMessages = (isDemo ? demoMessages : messages) || [];
  const loading = isDemo ? false : isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedMessage = messageSchema.parse({ content: newMessage });
      sendMessageMutation.mutate(validatedMessage.content);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const formatDateSeparator = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;
    return !isSameDay(new Date(currentMessage.created_at), new Date(previousMessage.created_at));
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="glass-effect border-b border-border-light p-4 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-elevated rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <Avatar className="h-10 w-10">
          {partnerProfile?.avatar_url && (
            <AvatarImage src={partnerProfile.avatar_url} alt={partnerName} />
          )}
          <AvatarFallback className="bg-gradient-primary text-white font-semibold">
            {getInitials(partnerName)}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h2 className="font-semibold text-foreground">{partnerName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 w-3/4 rounded-xl" />
              </div>
            ))}
          </div>
        ) : displayedMessages.length > 0 ? (
          <>
            {displayedMessages.map((message, index) => {
              const isOwnMessage = isDemo ? message.sender_id === 'me' : message.sender_id === currentUserId;
              const previousMessage = index > 0 ? displayedMessages[index - 1] : null;
              const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
              
              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-surface-glass text-foreground-muted text-xs rounded-full">
                        {formatDateSeparator(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex items-end space-x-2 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    {!isOwnMessage && (
                      <Avatar className="h-8 w-8">
                        {partnerProfile?.avatar_url && (
                          <AvatarImage src={partnerProfile.avatar_url} alt={partnerName} />
                        )}
                        <AvatarFallback className="bg-gradient-primary text-white text-xs">
                          {getInitials(partnerName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-gradient-primary text-white rounded-br-sm'
                            : 'bg-surface-glass text-foreground rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <span className="text-xs text-foreground-muted mt-1 px-2">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-foreground-secondary">No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="glass-effect border-t border-border-light p-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-surface-glass border-border-light"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-gradient-primary text-white hover:shadow-glow"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
