"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Car, UserCircle, RefreshCcw } from "lucide-react";
import DriverDashboard from "./driver-dashboard";
import HostDashboard from "./host-dashboard";

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Read mode from URL, default to 'driver'
    const mode = (searchParams.get('mode') === 'host' ? 'host' : 'driver') as 'driver' | 'host';

    const toggleMode = () => {
        const newMode = mode === 'driver' ? 'host' : 'driver';
        router.push(`/?mode=${newMode}`);
    };

    const setMode = (newMode: 'driver' | 'host') => {
        router.push(`/?mode=${newMode}`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Global Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode('driver')}>
                            <Car className={`w-8 h-8 ${mode === 'driver' ? 'text-blue-600' : 'text-gray-400'}`} />
                            <h1 className="font-bold text-2xl">로드메이트</h1>
                            <span className="text-xs font-normal text-gray-700 ml-2 border px-2 py-0.5 rounded-full border-gray-400">
                                {mode === 'driver' ? '게스트 모드' : '호스트 모드'}
                            </span>
                        </div>

                        <div className="flex gap-2 items-center">
                            {/* Mode Toggle */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleMode}
                                className="mr-2 hidden md:flex"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                {mode === 'driver' ? '호스트 모드로 전환' : '게스트 모드로 전환'}
                            </Button>

                            {/* User Menu */}
                            <span className="flex items-center text-sm font-medium mr-2 hidden sm:block">
                                {user.username}님
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")}>
                                <UserCircle className="w-5 h-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={onLogout}>로그아웃</Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {mode === 'driver' ? (
                    <DriverDashboard user={user} />
                ) : (
                    <HostDashboard user={user} />
                )}
            </main>
        </div>
    );
}
