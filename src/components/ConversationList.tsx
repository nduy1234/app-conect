import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  searchQuery: string;
  onSelectConversation: (userId: string, userName: string) => void;
}

interface Conversation {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  is_read: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({ searchQuery, onSelectConversation }) => {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all messages for current user and group by conversation partner
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();
      
      for (const message of messages || []) {
        const partnerId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        
        if (!conversationMap.has(partnerId)) {
          // Fetch partner profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', partnerId)
            .single();

          conversationMap.set(partnerId, {
            user_id: partnerId,
            display_name: profile?.display_name || 'Unknown User',
            avatar_url: profile?.avatar_url || null,
            last_message: message.content,
            last_message_time: message.created_at,
            is_read: message.receiver_id === user.id ? message.is_read : true,
          });
        }
      }

      const conversationList = Array.from(conversationMap.values());

      // Filter by search query
      if (searchQuery) {
        return conversationList.filter(conv =>
          conv.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return conversationList;
    },
  });

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
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start space-x-3 p-4 rounded-xl bg-surface-glass">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  // Sample conversations for demonstration
  const sampleConversations: Conversation[] = [
    {
      user_id: 'sample-1',
      display_name: 'TechVenture AI',
      avatar_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=100&h=100&fit=crop',
      last_message: 'We would love to discuss your investment proposal further.',
      last_message_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_read: false,
    },
    {
      user_id: 'sample-2',
      display_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      last_message: 'Thanks for connecting! Looking forward to our meeting next week.',
      last_message_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      is_read: true,
    },
    {
      user_id: 'sample-3',
      display_name: 'GreenTech Solutions',
      avatar_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      last_message: 'Our sustainability metrics have improved by 40% this quarter.',
      last_message_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
    },
    {
      user_id: 'sample-4',
      display_name: 'Michael Rodriguez',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      last_message: 'Can we schedule a call to discuss the partnership opportunity?',
      last_message_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
    },
    {
      user_id: 'sample-5',
      display_name: 'HealthFirst',
      avatar_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=100&h=100&fit=crop',
      last_message: 'Great progress on the Q4 goals! Keep up the excellent work.',
      last_message_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_read: true,
    },
  ];

  const displayConversations = (!conversations || conversations.length === 0) && !searchQuery
    ? sampleConversations
    : conversations;

  if (!displayConversations || displayConversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-secondary">
          {searchQuery ? 'No conversations found' : 'No messages yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayConversations.map((conv) => (
        <div
          key={conv.user_id}
          onClick={() => onSelectConversation(conv.user_id, conv.display_name)}
          className="flex items-start space-x-3 p-4 rounded-xl bg-surface-glass hover:bg-surface-elevated cursor-pointer transition-all duration-200 button-hover-scale"
        >
          <Avatar className="h-12 w-12">
            {conv.avatar_url && <AvatarImage src={conv.avatar_url} alt={conv.display_name} />}
            <AvatarFallback className="bg-gradient-primary text-white font-semibold">
              {getInitials(conv.display_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {conv.display_name}
              </h3>
              <span className="text-xs text-foreground-muted ml-2 whitespace-nowrap">
                {formatTime(conv.last_message_time)}
              </span>
            </div>
            <p className="text-sm text-foreground-secondary truncate">
              {conv.last_message}
            </p>
          </div>

          {!conv.is_read && (
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};
