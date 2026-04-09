import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

export default async function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect('/auth/login?callbackUrl=/workspace');
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-[#0d1117]">
            {children}
        </div>
    );
}