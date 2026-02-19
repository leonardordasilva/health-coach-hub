import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/index";
import { localeMap } from "@/i18n/index";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Search, Trash2, RefreshCw, Eye, UserPlus, Mail, Calendar, User, TrendingUp } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/health";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  birth_date: string | null;
  weight: number | null;
  height: number | null;
  is_default_password: boolean;
  created_at: string;
}

export default function AdminPanel() {
  const { t, language } = useLanguage();
  useDocumentTitle(t("admin.pageTitle"));
  const [search, setSearch] = useState("");
  const [filterDefaultPassword, setFilterDefaultPassword] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "" });

  const queryClient = useQueryClient();

  const fetchUsers = async (): Promise<UserProfile[]> => {
    const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "user");
    if (!roleData || roleData.length === 0) return [];
    const userIds = roleData.map((r) => r.user_id);
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, name, birth_date, weight, height, is_default_password, created_at")
      .in("id", userIds)
      .order("created_at", { ascending: false });
    if (profileError) throw profileError;
    return (profileData ?? []) as UserProfile[];
  };

  const { data: users = [], isLoading: loading } = useQuery({ queryKey: ["admin-users"], queryFn: fetchUsers });
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const growthChartData = useMemo(() => {
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(localeMap[language], { month: "short", year: "2-digit" });
      const count = users.filter(u => {
        const c = new Date(u.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length;
      months.push({ month: label, count });
    }
    return months;
  }, [users, language]);

  const filtered = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) || (u.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !filterDefaultPassword || u.is_default_password;
    return matchesSearch && matchesFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke("create-user", { body: { email: form.email } });
      if (error) throw error;
      toast.success(t("admin.createSuccess", { email: form.email }));
      setShowCreateModal(false);
      setForm({ email: "" });
      refreshUsers();
    } catch { toast.error(t("admin.createError")); } finally { setCreating(false); }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke("reset-password", { body: { email, userId } });
      if (error) throw error;
      toast.success(t("admin.resetPasswordSuccess"));
      refreshUsers();
    } catch { toast.error(t("admin.resetPasswordError")); }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      const { error } = await supabase.functions.invoke("delete-user", { body: { userId: deleteUserId } });
      if (error) throw error;
      toast.success(t("admin.deleteSuccess"));
      setDeleteUserId(null);
      setShowDetailModal(false);
      refreshUsers();
    } catch { toast.error(t("admin.deleteError")); }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("admin.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("admin.subtitle")}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gradient-hero text-primary-foreground shadow-health hover:opacity-90 transition-opacity gap-2">
            <UserPlus className="w-4 h-4" />{t("admin.newUser")}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-health border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center"><Users className="w-5 h-5 text-accent-foreground" /></div>
              <div><p className="text-sm text-muted-foreground">{t("admin.totalUsers")}</p><p className="text-2xl font-bold text-foreground">{users.length}</p></div>
            </CardContent>
          </Card>
          <Card className={`shadow-health border-border/50 cursor-pointer transition-all hover:shadow-md ${filterDefaultPassword ? "ring-2 ring-warning/50 bg-warning/5" : ""}`} onClick={() => setFilterDefaultPassword(p => !p)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Mail className="w-5 h-5 text-warning" /></div>
              <div className="flex-1"><p className="text-sm text-muted-foreground">{t("admin.defaultPassword")}</p><p className="text-2xl font-bold text-foreground">{users.filter(u => u.is_default_password).length}</p></div>
              {filterDefaultPassword && <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs">{t("admin.filterActive")}</Badge>}
            </CardContent>
          </Card>
        </div>

        {!loading && users.length > 0 && (
          <Card className="shadow-health border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />{t("admin.growthChart")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={growthChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [value, t("admin.newUsers")]} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-health border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t("admin.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="icon" onClick={refreshUsers} className="h-9 w-9 flex-shrink-0"><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2"><Users className="w-10 h-10 text-muted-foreground/40" /><p className="text-muted-foreground">{t("admin.noUsers")}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("admin.email")}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t("admin.name")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("admin.birthDate")}</TableHead>
                      <TableHead>{t("admin.status")}</TableHead>
                      <TableHead className="text-right">{t("admin.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{user.email}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.name || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(user.birth_date, language)}</TableCell>
                        <TableCell>
                          {user.is_default_password ? (
                            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs">{t("admin.defaultPassword")}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-success border-success/30 bg-success-light text-xs">{t("admin.active")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(user); setShowDetailModal(true); }} className="h-8 gap-1.5 text-xs">
                            <Eye className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t("admin.details")}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" />{t("admin.createTitle")}</DialogTitle>
            <DialogDescription>{t("admin.createDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">{t("admin.emailRequired")}</Label>
              <Input id="new-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder={t("admin.emailPlaceholder")} />
            </div>
            <DialogFooter className="gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={creating} className="gradient-hero text-primary-foreground">{creating ? t("admin.createSubmitting") : t("admin.createSubmit")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />{t("admin.detailTitle")}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">{t("admin.name")}</p><p className="text-sm font-medium">{selectedUser.name || "—"}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">{t("admin.email")}</p><p className="text-sm font-medium">{selectedUser.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">{t("admin.birthDate")}</p><p className="text-sm font-medium">{formatDate(selectedUser.birth_date, language)}</p></div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">{t("admin.registeredAt")}</p>
                    <p className="text-sm font-medium">{formatDateTime(selectedUser.created_at, language)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2 text-sm" onClick={() => handleResetPassword(selectedUser.id, selectedUser.email)}>
                  <RefreshCw className="w-4 h-4" />{t("admin.resetPasswordBtn")}
                </Button>
                <Button variant="destructive" className="flex-1 gap-2 text-sm" onClick={() => setDeleteUserId(selectedUser.id)}>
                  <Trash2 className="w-4 h-4" />{t("admin.deleteUser")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.deleteConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
