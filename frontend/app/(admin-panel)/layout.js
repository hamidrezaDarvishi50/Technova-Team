import {AdminAuthProvider} from "@/context/AdminAuthProvider";
import AdminLayoutShell from "@/components/AdminPanel/AdminLayoutShell/AdminLayoutShell";

export default function AdminLayout({ children }) {
    return (
        <AdminAuthProvider>
            <AdminLayoutShell>
                {children}
            </AdminLayoutShell>
        </AdminAuthProvider>
    );
}