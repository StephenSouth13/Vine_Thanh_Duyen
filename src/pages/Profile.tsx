import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, User, Mail, Phone, Calendar, Users, Clock, Briefcase, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// --- TYPE DEFINITIONS ---
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null; // Public URL
  cv_url: string | null; // File Path (documents/user-id-cv-timestamp.pdf)
  team_id: string | null;
  shift_id: string | null;
  phone: string | null;
  date_of_birth: string | null;
  annual_leave_balance: number;
  last_online: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

// --- MAIN COMPONENT ---
export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  // State cho Signed URL của CV (để hiển thị link tải về bảo mật)
  const [cvSignedUrl, setCvSignedUrl] = useState<string | null>(null); 

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      date_of_birth: "",
    },
  });

  // Hàm tạo Signed URL (URL có thời hạn) cho file Private
  const getSignedUrl = useCallback(async (path: string) => {
    try {
        // Thời hạn 60 giây
        const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(path, 60); 
        return data?.signedUrl || null;
    } catch (error) {
        console.error("Error creating signed URL:", error);
        return null;
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // FIX TypeScript Error 2352: Ép kiểu qua 'unknown' trước
      setProfile(profileData as unknown as UserProfile);

      form.reset({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        phone: profileData.phone || "",
        date_of_birth: profileData.date_of_birth || "",
      });
      
      // Xử lý Signed URL cho CV (nếu có cv_url)
      if (profileData && profileData.cv_url) {
          const url = await getSignedUrl(profileData.cv_url);
          setCvSignedUrl(url);
      } else {
          setCvSignedUrl(null);
      }

      // Fetch Team Info
      if (profileData.team_id) {
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", profileData.team_id)
          .single();
        setTeam(teamData);
      }

      // Fetch Shift Info
      if (profileData.shift_id) {
        const { data: shiftData } = await supabase
          .from("shifts")
          .select("id, name, start_time, end_time")
          .eq("id", profileData.shift_id)
          .single();
        setShift(shiftData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [navigate, form, getSignedUrl]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedFields = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updatedFields)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      
      // Tối ưu hóa: Cập nhật state cục bộ thay vì gọi lại loadProfile()
      setProfile(prevProfile => {
          if (!prevProfile) return null;
          return {
              ...prevProfile,
              ...updatedFields,
          };
      });

    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }

      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      // ĐÚNG: SỬ DỤNG FULL PATH CHO STORAGE
      const filePath = `avatars/${fileName}`; 

      // 1. Upload file
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Lấy Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Cập nhật profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
      
      // Tối ưu hóa: Cập nhật state cục bộ
      setProfile(prevProfile => {
          if (!prevProfile) return null;
          return {
              ...prevProfile,
              avatar_url: publicUrl,
          };
      });

    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
   const file = event.target.files?.[0];
   if (!file) return;

   if (file.size > 10 * 1024 * 1024) {
    toast.error("File size must be less than 10MB");
    return;
   }

   if (!file.type.includes("pdf")) {
    toast.error("Only PDF files are allowed");
    return;
   }

   setUploading(true);
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) return;

   const fileName = `${user.id}-cv-${Date.now()}.pdf`;
   // ĐÚNG: SỬ DỤNG FULL PATH CHO STORAGE (documents/user-id-...)
   const filePath = `documents/${fileName}`; 
      
      // 1. Upload file
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Cập nhật profile (lưu FILE PATH ĐẦY ĐỦ vào DB)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cv_url: filePath }) 
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("CV uploaded successfully");
      
      // Tối ưu hóa: Cập nhật state cục bộ và tạo Signed URL mới
      setProfile(prevProfile => {
          if (!prevProfile) return null;
          return {
              ...prevProfile,
              cv_url: filePath,
          };
      });
      // Tạo signed URL mới ngay sau khi upload
      const newSignedUrl = await getSignedUrl(filePath);
      setCvSignedUrl(newSignedUrl);
      
    } catch (error) {
      console.error("Error uploading CV:", error);
      toast.error("Failed to upload CV");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const initials = `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-2">Manage your personal information</p>
        </div>

        <div className="grid gap-6">
          {/* Avatar Card */}
          <Card className="shadow-medium transition-smooth hover:shadow-strong">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a profile picture to personalize your account</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl bg-gradient-primary text-primary-foreground">
                  {initials || <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-smooth">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload New Photo
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max size 2MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CV Upload Card */}
          <Card className="shadow-medium transition-smooth hover:shadow-strong">
            <CardHeader>
              <CardTitle>Curriculum Vitae</CardTitle>
              <CardDescription>Upload your CV for your professional profile</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex-1">
                {profile.cv_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-secondary rounded-md">
                      <FileText className="h-5 w-5 text-primary" />
                      <a
                        // SỬ DỤNG SIGNED URL
                        href={cvSignedUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm font-medium ${cvSignedUrl ? 'text-primary hover:underline' : 'text-muted-foreground'}`}
                        onClick={(e) => {
                            if (!cvSignedUrl) {
                                e.preventDefault();
                                toast.warning("Generating temporary URL, please try again soon.");
                                loadProfile(); // Tải lại để generate Signed URL
                            }
                        }}
                      >
                        {cvSignedUrl ? "View CV (PDF)" : "Loading secure link..."}
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No CV uploaded yet</p>
                )}
                <Label htmlFor="cv-upload" className="cursor-pointer mt-3 block">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-smooth">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload CV
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleCVUpload}
                  disabled={uploading}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  PDF only. Max size 10MB
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Personal Information Card */}
          <Card className="shadow-medium transition-smooth hover:shadow-strong">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type="tel" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} type="date" className="pl-10" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input value={profile.email} disabled className="pl-10 bg-muted" />
                      </div>
                      <p className="text-sm text-muted-foreground">Email cannot be changed</p>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          
         
        </div>
      </div>
    </DashboardLayout>
  );
}