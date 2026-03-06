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
import { toast } from "sonner";
import { Search, Trash2, RefreshCw, Eye, UserPlus, Mail, Calendar, User, TrendingUp, KeyRound, CheckCircle2, ChevronDown } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/health";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  birth_date: string | null;
  weight: number | null;
  height: number | null;
  is_default_password: boolean;
  created_at: string;
  avatar_url?: string | null;
}

export default function AdminPanel() {
  const { t, language } = useLanguage();
  useDocumentTitle(t("admin.pageTitle"));
  const { profile } = useAuth();
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
      .select("id, email, name, birth_date, weight, height, is_default_password, created_at, avatar_url")
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

  const totalGrowthCurrentMonth = growthChartData.length > 0 ? growthChartData[growthChartData.length - 1].count : 0;
  const previousMonth = growthChartData.length > 1 ? growthChartData[growthChartData.length - 2].count : 0;
  const growthPercent = previousMonth > 0 ? ((totalGrowthCurrentMonth - previousMonth) / previousMonth) * 100 : 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">

        {/* --- STITCH UI SECTIONS FOR ADMIN --- */}

        {/* Welcome Section */}
        <div className="@container">
          <div className="flex flex-col gap-4 @[400px]:flex-row @[400px]:items-center justify-between bg-card dark:bg-slate-900/50 p-5 rounded-xl shadow-sm border border-border">
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{t("common.welcome")}, Dr. {profile?.name?.split(" ")[0] || "Coach"}!</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("admin.subtitle")}</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">{t("admin.newUser")}</span>
            </button>
          </div>
        </div>

        {/* Growth Chart */}
        {!loading && users.length > 0 && (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card dark:bg-slate-900/50 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{t("admin.totalUsers")}</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{users.length} {t("admin.students")}</h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                  {growthPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(growthPercent).toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground uppercase">{t("admin.growthChart")}</p>
              </div>
            </div>
            <div className="mt-2" style={{ height: "180px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: number) => [value, t("admin.newUsers")]} cursor={{ fill: "hsl(var(--primary)/0.1)" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Student Management Header */}
        <div className="pt-2">
          <h2 className="text-lg font-bold text-foreground">{t("admin.studentManagement")}</h2>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card dark:bg-slate-900 border border-border rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => setFilterDefaultPassword(p => !p)}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm outline-none border ${filterDefaultPassword ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:bg-accent'}`}
            title={filterDefaultPassword ? "Clear Filter" : "Filter Pending/Default Password"}
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button
            onClick={refreshUsers}
            className="p-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm outline-none border bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Refresh List"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Student List */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2"><Users className="w-10 h-10 text-muted-foreground/40" /><p className="text-muted-foreground">{t("admin.noUsers")}</p></div>
          ) : (
            filtered.map((user) => (
              <div key={user.id} className="bg-card dark:bg-slate-900/50 p-4 rounded-xl border border-border flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-accent dark:bg-slate-800 flex items-center justify-center text-muted-foreground font-bold overflow-hidden shrink-0 border border-border/50">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name || "User avatar"} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden max-w-[150px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-full">
                    <h4 className="text-sm font-bold text-foreground truncate">{user.name || "—"}</h4>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1 flex">
                      {user.is_default_password ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase tracking-widest">{t("admin.pending")}</span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-widest">{t("admin.active")}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    title={t("admin.resetPasswordBtn")}
                    onClick={() => handleResetPassword(user.id, user.email)}
                  >
                    <KeyRound className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    title={t("admin.details")}
                    onClick={() => { setSelectedUser(user); setShowDetailModal(true); }}
                  >
                    <Eye className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    title={t("admin.deleteUser")}
                    onClick={() => setDeleteUserId(user.id)}
                  >
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
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
              <Button type="submit" disabled={creating} className="bg-primary text-primary-foreground hover:opacity-90">{creating ? t("admin.createSubmitting") : t("admin.createSubmit")}</Button>
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
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-accent dark:bg-slate-800 flex items-center justify-center text-muted-foreground font-bold overflow-hidden border border-border/50">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt={selectedUser.name || "User avatar"} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedUser.name || "—"}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    {selectedUser.is_default_password ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase">{t("admin.pending")}</span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">{t("admin.active")}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div><p className="text-xs text-muted-foreground">{t("admin.email")}</p><p className="text-sm font-medium">{selectedUser.email}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div><p className="text-xs text-muted-foreground">{t("admin.birthDate")}</p><p className="text-sm font-medium">{formatDate(selectedUser.birth_date, language)}</p></div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground">{t("admin.registeredAt")}</p>
                    <p className="text-sm font-medium">{formatDateTime(selectedUser.created_at, language)}</p>
                  </div>
                </div>
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
