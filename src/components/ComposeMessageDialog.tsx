import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Send, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const messageSchema = z.object({
  to: z.string().trim().min(1, 'Recipient is required').max(100),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
});

type MessageFormValues = z.infer<typeof messageSchema>;

export const ComposeMessageDialog: React.FC<ComposeMessageDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      to: '',
      subject: '',
      message: '',
    },
  });

  // Sample users for testing when database is empty
  const sampleUsers = [
    { user_id: 'sample-1', display_name: 'Jon Wen', avatar_url: '/src/assets/avatar-jon-wen.jpg' },
    { user_id: 'sample-2', display_name: 'Jane Smith', avatar_url: '/src/assets/avatar-jane-smith.jpg' },
    { user_id: 'sample-3', display_name: 'Mike Johnson', avatar_url: '/src/assets/avatar-man.jpg' },
    { user_id: 'sample-4', display_name: 'Sarah Williams', avatar_url: '/src/assets/avatar-woman-3.jpg' },
  ];

  // Fetch user profiles for autocomplete
  const { data: dbProfiles = [] } = useQuery({
    queryKey: ['profiles', searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id)
        .limit(10);

      if (searchQuery) {
        query = query.ilike('display_name', `%${searchQuery}%`);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: open,
  });

  // Use sample users if database is empty, otherwise use real profiles
  const profiles = React.useMemo(() => {
    if (dbProfiles.length > 0) {
      return dbProfiles;
    }
    
    // Filter sample users by search query
    if (searchQuery) {
      return sampleUsers.filter(user => 
        user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return sampleUsers;
  }, [dbProfiles, searchQuery]);

  const onSubmit = async (values: MessageFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to send messages',
          variant: 'destructive',
        });
        return;
      }

      // Find receiver by display name
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('display_name', values.to)
        .limit(1);

      if (profileError || !profiles || profiles.length === 0) {
        toast({
          title: 'Error',
          description: 'Recipient not found. Please check the name and try again.',
          variant: 'destructive',
        });
        return;
      }

      const receiverId = profiles[0].user_id;

      // Send message with subject included in content
      const messageContent = `Subject: ${values.subject}\n\n${values.message}`;
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: messageContent,
        });

      if (messageError) throw messageError;

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>To</FormLabel>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={popoverOpen}
                          className="justify-between font-normal"
                        >
                          {field.value || "Select recipient..."}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search users..." 
                          value={searchQuery}
                          onValueChange={setSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {profiles.map((profile) => (
                              <CommandItem
                                key={profile.user_id}
                                value={profile.display_name || ''}
                                onSelect={() => {
                                  form.setValue('to', profile.display_name || '');
                                  setPopoverOpen(false);
                                  setSearchQuery('');
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    field.value === profile.display_name
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                />
                                {profile.display_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter subject..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Type your message here..." 
                      className="min-h-[150px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
