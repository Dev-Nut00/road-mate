"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plus, List as ListIcon, DollarSign, Calendar, CheckCircle, Car } from "lucide-react";
import { getSpaces, toggleSpaceStatus, deleteSpace, getHostReservations } from "@/lib/api";
import { ParkingSpot } from "@/app/components/parking-card";
import { toast } from "sonner";

export default function HostDashboard({ user }: { user: any }) {
    const router = useRouter();
    const [mySpaces, setMySpaces] = useState<ParkingSpot[]>([]);
    const [incomingReservations, setIncomingReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingSpaceId, setDeletingSpaceId] = useState<number | null>(null);

    const fetchData = async () => {
        try {
            const [spaces, reservations] = await Promise.all([
                getSpaces({ mine: true }),
                getHostReservations()
            ]);
            setMySpaces(spaces);
            setIncomingReservations(reservations);
        } catch (e) {
            console.error(e);
            toast.error("데이터를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user.id]);

    // Calculate total income (confirmed & completed)
    const totalIncome = incomingReservations
        .filter(r => ['CONFIRMED', 'COMPLETED'].includes(r.status))
        .reduce((sum, r) => sum + Number(r.price_total), 0);

    // Handlers
    const handleToggleStatus = async (id: number, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleSpaceStatus(id, !currentStatus);
            toast.success(currentStatus ? "주차장이 비활성화되었습니다." : "주차장이 활성화되었습니다.");
            // Refresh specific query not full reload ideally, but keeping simple
            const spaces = await getSpaces({ mine: true });
            setMySpaces(spaces);
        } catch (error) {
            console.error(error);
            toast.error("상태 변경에 실패했습니다.");
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();

        if (deletingSpaceId === id) {
            // Second click - actually delete
            try {
                await deleteSpace(id);
                toast.success("주차장이 삭제되었습니다.");
                setDeletingSpaceId(null);
                // Reload page to refresh space list
                window.location.reload();
            } catch (error: any) {
                console.error("Delete space error:", error);
                const msg = error.response?.data?.error || error.response?.data?.detail || "삭제에 실패했습니다.";
                toast.error(msg);
                setDeletingSpaceId(null);
            }
        } else {
            // First click - show confirmation
            setDeletingSpaceId(id);
        }
    };

    const handleEdit = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/spaces/edit/${id}`);
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">내 주차장</CardTitle>
                        <ListIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mySpaces.length}개</div>
                        <p className="text-xs text-muted-foreground">등록된 주차 공간</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">총 수익</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalIncome.toLocaleString()}원</div>
                        <p className="text-xs text-muted-foreground">확정된 예약 기준</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">예약 요청</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{incomingReservations.length}건</div>
                        <p className="text-xs text-muted-foreground">전체 예약 내역</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">내 주차장 목록</h2>
                <Button onClick={() => router.push("/spaces/register")}>
                    <Plus className="w-4 h-4 mr-2" />
                    주차장 등록하기
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {loading ? (
                    <div>Loading...</div>
                ) : mySpaces.length > 0 ? (
                    mySpaces.map(space => (
                        <Card key={space.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <div className="h-40 bg-gray-200 overflow-hidden relative">
                                {space.images && space.images.length > 0 ? (
                                    <img src={space.images[0].image} alt={space.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">이미지 없음</div>
                                )}
                                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${space.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                    {space.is_active ? '운영중' : '비활성'}
                                </div>
                            </div>
                            <CardHeader className="p-4">
                                <CardTitle className="text-lg">{space.title}</CardTitle>
                                <CardDescription className="line-clamp-1">{space.address}</CardDescription>
                            </CardHeader>
                            <div className="flex justify-between items-center bg-gray-50 px-4 py-2 border-t">
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={space.is_active ? "destructive" : "default"}
                                        onClick={(e) => handleToggleStatus(space.id, space.is_active, e)}
                                    >
                                        {space.is_active ? "운영 중지" : "운영 시작"}
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={(e) => handleEdit(space.id, e)}>수정</Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={deletingSpaceId === space.id ? "text-white bg-red-700 hover:bg-red-800" : "text-red-500 hover:text-red-700"}
                                        onClick={(e) => handleDelete(space.id, e)}
                                    >
                                        {deletingSpaceId === space.id ? "정말 삭제하시겠습니까?" : "삭제"}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-3 text-center py-10 text-gray-500 border rounded-lg bg-gray-50">
                        등록된 주차장이 없습니다. 공간을 등록하고 수익을 창출해보세요!
                    </div>
                )}
            </div>

            {/* Incoming Reservations List */}
            {incomingReservations.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-4">들어온 예약 목록</h2>
                    <div className="space-y-4">
                        {incomingReservations.map((res) => (
                            <div key={res.id} className="bg-white p-6 rounded-lg border flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-lg">{res.space.title}</h3>
                                        <Badge className={
                                            res.status === 'CONFIRMED' ? "bg-green-500" :
                                                res.status === 'CANCELED' ? "bg-gray-500" : "bg-yellow-500"
                                        }>
                                            {res.status === 'CONFIRMED' ? '확정' : res.status === 'CANCELED' ? '취소됨' : res.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(res.start_at).toLocaleDateString()} {new Date(res.start_at).getHours()}:00
                                        ~ {new Date(res.end_at).getHours()}:00
                                        ({(new Date(res.end_at).getTime() - new Date(res.start_at).getTime()) / 3600000}시간)
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">예약자: {res.driver?.username || "Guest"} (차량: {res.carNumber || res.vehicle?.car_number || "미등록"})</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <div>
                                        <p className="font-bold text-lg">{Number(res.price_total).toLocaleString()}원</p>
                                        <p className="text-xs text-gray-400">{new Date(res.created_at).toLocaleDateString()} 예약됨</p>
                                    </div>

                                    {res.status === 'PENDING' && (
                                        <div className="flex gap-2 mt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={async () => {
                                                    if (!confirm("이 예약을 거절하시겠습니까?")) return;
                                                    try {
                                                        const { rejectReservationAPI } = await import("@/lib/api");
                                                        await rejectReservationAPI(res.id);
                                                        toast.success("예약이 거절되었습니다.");
                                                        fetchData(); // Refresh list
                                                    } catch (e) {
                                                        toast.error("거절 실패");
                                                    }
                                                }}
                                            >
                                                거절
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={async () => {
                                                    if (!confirm("이 예약을 승인하시겠습니까?")) return;
                                                    try {
                                                        const { confirmReservationAPI } = await import("@/lib/api");
                                                        await confirmReservationAPI(res.id);
                                                        toast.success("예약이 승인되었습니다.");
                                                        fetchData(); // Refresh list
                                                    } catch (e) {
                                                        toast.error("승인 실패");
                                                    }
                                                }}
                                            >
                                                승인
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
