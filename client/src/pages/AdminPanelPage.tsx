import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, DollarSign, TrendingUp, Edit, Trash2, Settings, UserPlus, Power, Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface Doctor {
  id: string;
  fullName: string;
  specialization: string;
  clinicId: string;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  userType: string;
  isActive: boolean;
}

interface Stats {
  users: number;
  patients: number;
  doctors: number;
  clinics: number;
  appointments: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
  };
}

async function fetchStats(): Promise<Stats> {
  const response = await fetch('/api/v1/admin/stats', { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 403) throw new Error('غير مصرح لك بالوصول لهذه الصفحة');
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}

async function fetchDoctors(): Promise<Doctor[]> {
  const response = await fetch('/api/v1/admin/doctors', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch doctors');
  return response.json();
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/v1/admin/users', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

async function toggleDoctorAvailability(id: string): Promise<void> {
  const response = await fetch(`/api/v1/admin/doctors/${id}/availability`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to toggle availability');
}

async function createUser(userData: any): Promise<void> {
  const response = await fetch('/api/v1/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }
}

async function updateUser(id: string, userData: Partial<User>): Promise<void> {
  const response = await fetch(`/api/v1/admin/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update user');
  }
}

async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`/api/v1/admin/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete user');
}

export default function AdminPanelPage() {
  const { language } = useLanguage();
  const { userId: currentUserId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    userType: 'patient' as string,
  });

  // Fetch data
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
  });

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: fetchDoctors,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  });

  // Mutations
  const toggleAvailabilityMutation = useMutation({
    mutationFn: toggleDoctorAvailability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      toast({ title: language === 'ar' ? 'تم تحديث الحالة' : 'Status updated' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsAddUserOpen(false);
      setNewUser({ username: '', password: '', fullName: '', email: '', phone: '', userType: 'patient' });
      toast({ title: language === 'ar' ? 'تم إنشاء المستخدم' : 'User created' });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserToDelete(null);
      toast({ title: language === 'ar' ? 'تم حذف المستخدم' : 'User deleted' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'Error occurred', variant: 'destructive' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      toast({ title: language === 'ar' ? 'تم تحديث المستخدم' : 'User updated' });
    },
    onError: (error: any) => {
      toast({ title: error.message || (language === 'ar' ? 'حدث خطأ' : 'Error occurred'), variant: 'destructive' });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password || !newUser.fullName) {
      toast({ title: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    if (!editingUser.username || !editingUser.fullName) {
      toast({ title: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', variant: 'destructive' });
      return;
    }

    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        fullName: editingUser.fullName,
        email: editingUser.email || '',
        phone: editingUser.phone || '',
        userType: editingUser.userType,
        isActive: editingUser.isActive,
      },
    });
  };

  const handleToggleUserActive = (user: User) => {
    if (user.id === currentUserId) {
      toast({
        title: language === 'ar' ? 'لا يمكن تعطيل حسابك الحالي' : 'You cannot deactivate your current account',
        variant: 'destructive',
      });
      return;
    }

    updateUserMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  // Error state
  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">{language === 'ar' ? 'غير مصرح' : 'Unauthorized'}</h2>
        <p className="text-muted-foreground">
          {language === 'ar' ? 'لا تملك صلاحية للوصول لهذه الصفحة' : 'You do not have permission to access this page'}
        </p>
      </div>
    );
  }

  const isLoading = statsLoading || doctorsLoading || usersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">
          {language === 'ar' ? 'لوحة تحكم المسؤول' : 'Admin Panel'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {language === 'ar' ? 'إدارة النظام والأطباء والإحصائيات' : 'Manage system, doctors, and statistics'}
        </p>
      </div>

      {/* Statistics */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{language === 'ar' ? 'الأطباء' : 'Doctors'}</p>
                  <p className="text-3xl font-bold">{stats?.doctors || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{language === 'ar' ? 'المواعيد' : 'Appointments'}</p>
                  <p className="text-3xl font-bold">{stats?.appointments?.total || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{language === 'ar' ? 'المرضى' : 'Patients'}</p>
                  <p className="text-3xl font-bold">{stats?.patients || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{language === 'ar' ? 'العيادات' : 'Clinics'}</p>
                  <p className="text-3xl font-bold">{stats?.clinics || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="doctors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="doctors">{language === 'ar' ? 'الأطباء' : 'Doctors'}</TabsTrigger>
          <TabsTrigger value="users">{language === 'ar' ? 'المستخدمين' : 'Users'}</TabsTrigger>
          <TabsTrigger value="settings">{language === 'ar' ? 'الإعدادات' : 'Settings'}</TabsTrigger>
        </TabsList>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إدارة الأطباء' : 'Manage Doctors'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تفعيل أو تعطيل الأطباء' : 'Enable or disable doctors'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{doctor.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={doctor.isAvailable ? "default" : "secondary"}>
                        {doctor.isAvailable
                          ? (language === 'ar' ? 'متاح' : 'Available')
                          : (language === 'ar' ? 'غير متاح' : 'Unavailable')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleAvailabilityMutation.mutate(doctor.id)}
                        disabled={toggleAvailabilityMutation.isPending}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'لا يوجد أطباء' : 'No doctors found'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users'}</CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'إضافة وحذف المستخدمين' : 'Add and remove users'}
                </CardDescription>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</DialogTitle>
                    <DialogDescription>
                      {language === 'ar' ? 'أدخل بيانات المستخدم الجديد' : 'Enter the new user details'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>{language === 'ar' ? 'اسم المستخدم' : 'Username'} *</Label>
                      <Input
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{language === 'ar' ? 'كلمة المرور' : 'Password'} *</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'} *</Label>
                      <Input
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{language === 'ar' ? 'نوع المستخدم' : 'User Type'}</Label>
                      <Select value={newUser.userType} onValueChange={(v) => setNewUser({ ...newUser, userType: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">{language === 'ar' ? 'مريض' : 'Patient'}</SelectItem>
                          <SelectItem value="doctor">{language === 'ar' ? 'طبيب' : 'Doctor'}</SelectItem>
                          <SelectItem value="student">{language === 'ar' ? 'طالب' : 'Student'}</SelectItem>
                          <SelectItem value="graduate">{language === 'ar' ? 'خريج' : 'Graduate'}</SelectItem>
                          <SelectItem value="admin">{language === 'ar' ? 'مسؤول' : 'Admin'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {language === 'ar' ? 'إنشاء' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{user.fullName}</h3>
                      <p className="text-sm text-muted-foreground">@{user.username} • {user.userType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive
                          ? (language === 'ar' ? 'نشط' : 'Active')
                          : (language === 'ar' ? 'معطل' : 'Inactive')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingUser(user)}
                        disabled={updateUserMutation.isPending}
                        title={language === 'ar' ? 'تعديل المستخدم' : 'Edit user'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleUserActive(user)}
                        disabled={updateUserMutation.isPending || user.id === currentUserId}
                        title={user.isActive
                          ? (language === 'ar' ? 'تعطيل المستخدم' : 'Deactivate user')
                          : (language === 'ar' ? 'تفعيل المستخدم' : 'Activate user')}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setUserToDelete(user)}
                        disabled={deleteUserMutation.isPending || user.id === currentUserId}
                        title={language === 'ar' ? 'حذف المستخدم' : 'Delete user'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'ar' ? 'إعدادات النظام' : 'System Settings'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'تكوين إعدادات المستشفى' : 'Configure hospital settings'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>{language === 'ar' ? 'اسم المستشفى' : 'Hospital Name'}</Label>
                  <Input defaultValue="Dento Health Care" />
                </div>
                <div className="grid gap-2">
                  <Label>{language === 'ar' ? 'ساعات العمل' : 'Working Hours'}</Label>
                  <Input defaultValue="9:00 AM - 9:00 PM" />
                </div>
                <Button className="mt-4">
                  <Settings className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل المستخدم' : 'Edit User'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'تعديل البيانات الأساسية وحالة الحساب' : 'Update basic user details and account status'}
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{language === 'ar' ? 'الاسم الكامل' : 'Full Name'} *</Label>
                <Input
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                <Input
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>{language === 'ar' ? 'نوع المستخدم' : 'User Type'}</Label>
                <Select value={editingUser.userType} onValueChange={(v) => setEditingUser({ ...editingUser, userType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">{language === 'ar' ? 'مريض' : 'Patient'}</SelectItem>
                    <SelectItem value="doctor">{language === 'ar' ? 'طبيب' : 'Doctor'}</SelectItem>
                    <SelectItem value="student">{language === 'ar' ? 'طالب' : 'Student'}</SelectItem>
                    <SelectItem value="graduate">{language === 'ar' ? 'خريج' : 'Graduate'}</SelectItem>
                    <SelectItem value="admin">{language === 'ar' ? 'مسؤول' : 'Admin'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{language === 'ar' ? 'حالة الحساب' : 'Account Status'}</Label>
                <Select
                  value={editingUser.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setEditingUser({ ...editingUser, isActive: v === 'active' })}
                  disabled={editingUser.id === currentUserId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                    <SelectItem value="inactive">{language === 'ar' ? 'معطل' : 'Inactive'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={updateUserMutation.isPending}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'حذف المستخدم' : 'Delete User'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? `هل أنت متأكد من حذف ${userToDelete?.fullName || ''}؟ سيتم تعطيل الحساب وإخفاؤه من القائمة.`
                : `Are you sure you want to delete ${userToDelete?.fullName || 'this user'}? The account will be disabled and hidden from the list.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              {language === 'ar' ? 'تراجع' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteUserMutation.isPending}
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending
                ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...')
                : (language === 'ar' ? 'تأكيد الحذف' : 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
