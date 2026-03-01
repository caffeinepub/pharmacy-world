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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccountFormModal } from "../components/AccountFormModal";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";

export function AccountsPage() {
  const { accounts, updateAccount, deleteAccount } = useData();
  const { currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleToggle = async (id: string, enabled: boolean) => {
    const acc = accounts.find((a) => a.id === id);
    await updateAccount(id, { enabled });
    toast.success(
      `${acc?.fullName} account ${enabled ? "enabled" : "disabled"}`,
    );
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const acc = accounts.find((a) => a.id === deleteId);
    await deleteAccount(deleteId);
    toast.success(`${acc?.fullName}'s account deleted`);
    setDeleteId(null);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Account Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {accounts.length} accounts registered
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">
                  Full Name
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  Username
                </TableHead>
                <TableHead className="text-xs font-semibold">Role</TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold">Created</TableHead>
                <TableHead className="text-xs font-semibold text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => {
                const isAdmin = acc.role === "admin";
                const isSelf = acc.id === currentUser?.id;

                return (
                  <TableRow key={acc.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">
                      {acc.fullName}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {acc.username}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          isAdmin
                            ? "bg-primary/15 text-primary border-0 text-xs"
                            : "bg-secondary text-secondary-foreground text-xs"
                        }
                      >
                        {acc.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={acc.enabled}
                          onCheckedChange={(v) =>
                            !isAdmin && handleToggle(acc.id, v)
                          }
                          disabled={isAdmin}
                        />
                        <span
                          className={`text-xs font-medium ${acc.enabled ? "text-success" : "text-destructive"}`}
                        >
                          {acc.enabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(acc.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {!isAdmin && !isSelf ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(acc.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AccountFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {accounts.find((a) => a.id === deleteId)?.fullName}
              </strong>
              's account? They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
