import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { 
  Home,
  User,
  BookOpen,
  MessageSquare,
  Building2,
  Bell,
  Settings,
  Camera,
  Video,
  Users,
  TrendingUp,
  LogOut
} from 'lucide-react';

// Data structures and types for the mobile app
interface ProfileData {
  id?: string;
  user_id?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

type Tab = 'home' | 'profile' | 'resource' | 'message' | 'startups';

const MobileApp = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management for different screens and user data
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [profileData, setProfileData] = useState<ProfileData>({
    display_name: '',
    first_name: '',
    last_name: '',
    bio: '',
    avatar_url: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Refs for file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Check authentication state and redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load user profile data when user is authenticated
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: profileData.display_name,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="mobile-container">
        <div className="min-h-screen bg-gradient-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground-secondary">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null;
  }

  // Main app interface for authenticated users
  return (
    <div className="mobile-container">
      <div className="min-h-screen bg-gradient-background">
        {/* Header with user info and logout */}
        <div className="bg-surface-glass backdrop-blur-md border-b border-border sticky top-0 z-50">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-xl font-bold gradient-text">Connect</h1>
              <p className="text-sm text-foreground-secondary">
                Welcome back, {profileData.display_name || profileData.first_name || user.email}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-foreground-secondary hover:text-error"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main content based on active tab */}
        <div className="pb-20 px-4 pt-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="glass-effect border-0">
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">1.2k</p>
                    <p className="text-xs text-foreground-secondary">Connections</p>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-0">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-6 w-6 text-success mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">+15%</p>
                    <p className="text-xs text-foreground-secondary">Growth</p>
                  </CardContent>
                </Card>
              </div>

              {/* Notifications */}
              <Card className="glass-effect border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Recent Activity</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-sm text-foreground-secondary">New connection request from Sarah</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <p className="text-sm text-foreground-secondary">Your profile was viewed 12 times</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-info rounded-full"></div>
                      <p className="text-sm text-foreground-secondary">3 new messages in Tech Group</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Settings */}
              <Card className="glass-effect border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Settings className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Quick Settings</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Push Notifications</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Location Services</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Profile Visibility</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Header */}
              <Card className="glass-effect border-0">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profileData.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                        {profileData.display_name?.charAt(0) || profileData.first_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {profileData.display_name || `${profileData.first_name} ${profileData.last_name}`.trim() || 'Your Name'}
                  </h2>
                  <p className="text-foreground-secondary mb-4">{user.email}</p>
                  <div className="flex justify-center gap-2 mb-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Mobile Professional
                    </Badge>
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      Verified
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Edit Form */}
              <Card className="glass-effect border-0">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-foreground mb-4">Edit Profile</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.first_name || ''}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        placeholder="First name"
                        className="bg-surface border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.last_name || ''}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        placeholder="Last name"
                        className="bg-surface border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-foreground">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profileData.display_name || ''}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      placeholder="How you want to be shown"
                      className="bg-surface border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-foreground">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio || ''}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="bg-surface border-border min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-foreground">Profile Image</Label>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex-1 border-border hover:bg-accent"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        className="flex-1 border-border hover:bg-accent"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Upload Video
                      </Button>
                    </div>
                    <input 
                      ref={imageInputRef} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <input 
                      ref={videoInputRef} 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                    />
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 button-hover-scale"
                  >
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Other tabs remain the same */}
          {activeTab === 'resource' && (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-foreground-secondary">Resources coming soon...</p>
            </div>
          )}

          {activeTab === 'message' && (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-foreground-secondary">Messages coming soon...</p>
            </div>
          )}

          {activeTab === 'startups' && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-foreground-secondary">Startups coming soon...</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface-glass backdrop-blur-md border-t border-border">
          <div className="mobile-container">
            <div className="flex justify-around py-2">
              {[
                { key: 'home', icon: Home, label: 'Home' },
                { key: 'profile', icon: User, label: 'Profile' },
                { key: 'resource', icon: BookOpen, label: 'Resources' },
                { key: 'message', icon: MessageSquare, label: 'Messages' },
                { key: 'startups', icon: Building2, label: 'Startups' },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as Tab)}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                    activeTab === key 
                      ? 'text-primary bg-primary/10' 
                      : 'text-foreground-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileApp;
