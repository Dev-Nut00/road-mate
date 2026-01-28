"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ParkingCard, ParkingSpot } from "@/app/components/parking-card";
import { SpaceDetailDialog } from "@/app/components/space-detail-dialog";
import NaverMap from "@/app/components/naver-map";
import { ReservationDialog } from "@/app/components/reservation-dialog";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Search, MapIcon, List, Plus, Car, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getSpaces, createReservation, getMyReservations, cancelReservation, getVehicles, addVehicle, deleteVehicle } from "@/lib/api";

export default function DriverDashboard({ user }: { user: any }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Read tab from URL, default to 'list'
    const activeTab = searchParams.get('tab') || 'list';

    const setActiveTab = (tab: string) => {
        const mode = searchParams.get('mode') || 'driver';
        router.push(`/?mode=${mode}&tab=${tab}`);
    };
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null); // Stores full object
    const [selectedReservation, setSelectedReservation] = useState<any>(null); // Stores reservation when viewing from reservations tab
    const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
    const [reservingParking, setReservingParking] = useState<ParkingSpot | null>(null);
    const [myReservations, setMyReservations] = useState<any[]>([]);
    const [spaces, setSpaces] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(true);

    // Vehicle State
    const [myVehicles, setMyVehicles] = useState<any[]>([]);
    const [newCarNumber, setNewCarNumber] = useState("");
    const [newCarModel, setNewCarModel] = useState("");
    const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);

    const handleCancelReservationFromDialog = async (id: number) => {
        try {
            await cancelReservation(id);
            toast.success("예약이 취소되었습니다.");
            setSelectedSpot(null);
            setSelectedReservation(null);
            // Reload page to refresh reservation list
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || "취소에 실패했습니다.";
            toast.error(msg);
        }
    };

    // Fetch Spaces
    useEffect(() => {
        const fetchSpaces = async () => {
            try {
                const data = await getSpaces();
                // Ensure data is an array
                setSpaces(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch spaces", error);
                toast.error("주차장 목록을 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchSpaces();
    }, []);

    // Fetch My Reservations
    useEffect(() => {
        if (activeTab === 'reservations') {
            const fetchReservations = async () => {
                try {
                    const data = await getMyReservations();
                    // Map backend reservation to UI model
                    const mapped = data.map((r: any) => ({
                        id: r.id,
                        parkingTitle: r.space.title, // Backend serializer should expand space
                        date: new Date(r.start_at).toLocaleDateString(),
                        startTime: new Date(r.start_at).getHours() + ":00",
                        duration: (new Date(r.end_at).getTime() - new Date(r.start_at).getTime()) / 3600000,
                        totalPrice: r.price_total,
                        carNumber: "등록됨",
                        status: r.status,
                        space: r.space, // Add full space object
                        rawStartAt: r.start_at // Store raw start time for cancellation check
                    }));
                    setMyReservations(mapped);
                } catch (e) {
                    console.error(e);
                }
            }
            fetchReservations();
        }
    }, [activeTab]);

    // Fetch Vehicles
    useEffect(() => {
        if (activeTab === 'vehicles') {
            const fetchVehicles = async () => {
                try {
                    const data = await getVehicles();
                    setMyVehicles(data);
                } catch (e) {
                    console.error(e);
                    toast.error("차량 목록을 불러오지 못했습니다.");
                }
            };
            fetchVehicles();
        }
    }, [activeTab]);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCarNumber.trim()) {
            toast.error("차량 번호를 입력해주세요.");
            return;
        }
        try {
            console.log("Adding vehicle:", { car_number: newCarNumber, car_model: newCarModel || "" });
            await addVehicle({
                car_number: newCarNumber.trim(),
                car_model: newCarModel.trim() || "",
                is_default: false
            });
            toast.success("차량이 등록되었습니다.");
            setNewCarNumber("");
            setNewCarModel("");
            // refresh
            const data = await getVehicles();
            setMyVehicles(data);
        } catch (e: any) {
            console.error("Add vehicle error:", e);
            console.error("Error response:", e.response?.data);
            const msg = e.response?.data?.error || e.response?.data?.detail || JSON.stringify(e.response?.data) || "차량 등록 실패";
            toast.error(msg);
        }
    };

    const handleDeleteVehicle = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();

        if (deletingVehicleId === id) {
            // Second click - actually delete
            try {
                await deleteVehicle(id);
                toast.success("차량이 삭제되었습니다.");
                setDeletingVehicleId(null);
                // Reload page to refresh vehicle list
                window.location.reload();
            } catch (e: any) {
                console.error("Delete vehicle error:", e);
                const msg = e.response?.data?.error || e.response?.data?.detail || "삭제 실패";
                toast.error(msg);
                setDeletingVehicleId(null);
            }
        } else {
            // First click - show confirmation
            setDeletingVehicleId(id);
        }
    };

    const filteredSpots = spaces.filter((spot) => {
        const matchesSearch = spot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            spot.address.toLowerCase().includes(searchQuery.toLowerCase());
        // Filter logic needs to match Backend data structure
        const matchesFilter = filterType === "all" ||
            (filterType === "available" && spot.is_active);
        return matchesSearch && matchesFilter;
    });

    const handleReserve = (id: number) => {
        const parking = spaces.find(p => p.id === id);
        if (parking) {
            setReservingParking(parking);
            setReservationDialogOpen(true);
        }
    };

    const handleViewDetail = (parking: ParkingSpot) => {
        setSelectedSpot(parking);
    };

    const handleReservationSuccess = () => {
        // Dialog handles creation and payment now
        setActiveTab("reservations");
        // Force refresh if needed, but changing tab usually works
        // If already on reservations, we might want to reload
        if (activeTab === 'reservations') {
            window.location.reload();
        }
    };

    return (
        <div className="w-full">
            {/* Search Bar */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            placeholder="지역, 주소로 주차장 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900"
                        />
                    </div>
                    <div className="w-40">
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">전체</option>
                            <option value="available">예약 가능</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full">
                <div className="mb-4 flex space-x-2 border-b">
                    <button
                        onClick={() => setActiveTab("list")}
                        className={`flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <List className="w-4 h-4 mr-2" />
                        목록
                    </button>
                    <button
                        onClick={() => setActiveTab("map")}
                        className={`flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'map' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <MapIcon className="w-4 h-4 mr-2" />
                        지도
                    </button>
                    <button
                        onClick={() => setActiveTab("reservations")}
                        className={`flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'reservations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        내 예약
                    </button>
                    <button
                        onClick={() => setActiveTab("vehicles")}
                        className={`flex items-center px-4 py-2 border-b-2 text-sm font-medium ${activeTab === 'vehicles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Car className="w-4 h-4 mr-2" />
                        내 차량
                    </button>
                </div>

                {/* 목록 뷰 */}
                {activeTab === 'list' && (
                    <div>
                        <div className="mb-4">
                            <p className="text-sm text-gray-800">
                                {filteredSpots.length}개의 주차 공간
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredSpots.length > 0 ? filteredSpots.map((parking) => (
                                <ParkingCard
                                    key={parking.id}
                                    parking={parking}
                                    onReserve={handleReserve}
                                    onClick={handleViewDetail}
                                />
                            )) : (
                                <div className="col-span-3 text-center py-10 text-gray-700">
                                    주차 공간이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 지도 뷰 */}
                {activeTab === 'map' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
                        <div className="lg:col-span-2 bg-gray-200 rounded-lg overflow-hidden">
                            <NaverMap
                                center={{ lat: 37.5665, lng: 126.9780 }}
                                zoom={15}
                                markers={filteredSpots.map(s => ({
                                    lat: 37.5665 + (Math.random() * 0.01 - 0.005), // Mock lat/lng if missing
                                    lng: 126.9780 + (Math.random() * 0.01 - 0.005),
                                    title: s.title
                                }))}
                            />
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                            {filteredSpots.map((parking) => (
                                <ParkingCard
                                    key={parking.id}
                                    parking={parking}
                                    onReserve={handleReserve}
                                    onClick={handleViewDetail}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* 내 예약 */}
                {activeTab === 'reservations' && (
                    <div>
                        {myReservations.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2 text-gray-900">예약 내역이 없습니다</h3>
                                <p className="text-gray-700 text-sm">주차 공간을 예약하고 편리하게 이용하세요</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myReservations.map((reservation) => (
                                    <div
                                        key={reservation.id}
                                        className="bg-white p-6 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => {
                                            setSelectedSpot(reservation.space);
                                            setSelectedReservation(reservation);
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-lg hover:text-blue-600">{reservation.parkingTitle || "주차장"}</h3>
                                                    <Badge className={reservation.status === 'CONFIRMED' ? "bg-green-500" : reservation.status === 'CANCELED' ? "bg-gray-500" : "bg-yellow-500"}>
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        {reservation.status === 'CONFIRMED' ? '확정' : reservation.status === 'CANCELED' ? '취소됨' : reservation.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-700">
                                                    {reservation.date} {reservation.startTime} • {reservation.duration}시간
                                                </p>
                                            </div>
                                            <p className="font-bold text-lg">{(reservation.totalPrice || 0).toLocaleString()}원</p>
                                        </div>
                                        <p className="text-xs text-blue-500 text-right mt-2">클릭하여 주차장 정보 확인 &gt;</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 내 차량 */}
                {activeTab === 'vehicles' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white p-6 rounded-lg border mb-8">
                            <h3 className="text-lg font-semibold mb-4">차량 등록</h3>
                            <form onSubmit={handleAddVehicle} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">차량 번호</label>
                                    <input
                                        type="text"
                                        value={newCarNumber}
                                        onChange={(e) => setNewCarNumber(e.target.value)}
                                        placeholder="예: 12가 3456"
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">차량 모델 (선택)</label>
                                    <input
                                        type="text"
                                        value={newCarModel}
                                        onChange={(e) => setNewCarModel(e.target.value)}
                                        placeholder="예: 현대 쏘나타"
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <Button type="submit">등록</Button>
                            </form>
                        </div>

                        <h3 className="text-lg font-semibold mb-4">등록된 차량 목록</h3>
                        {myVehicles.length === 0 ? (
                            <div className="text-center py-12 border rounded-lg bg-gray-50">
                                <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2 text-gray-900">등록된 차량이 없습니다</h3>
                                <p className="text-gray-700 text-sm">차량을 등록하고 예약을 진행하세요</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myVehicles.map(v => (
                                    <div key={v.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-100 p-3 rounded-full">
                                                <Car className="w-6 h-6 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg">{v.car_number}</p>
                                                <p className="text-sm text-gray-500">{v.car_model || "모델명 없음"}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className={deletingVehicleId === v.id ? "text-white bg-red-700 hover:bg-red-800" : "text-red-500 hover:text-red-600"}
                                            onClick={(e) => handleDeleteVehicle(v.id, e)}
                                        >
                                            {deletingVehicleId === v.id ? "정말로 삭제하시겠습니까?" : "삭제"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ReservationDialog
                open={reservationDialogOpen}
                onOpenChange={setReservationDialogOpen}
                parking={reservingParking}
                onSuccess={handleReservationSuccess}
            />

            <SpaceDetailDialog
                open={!!selectedSpot}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedSpot(null);
                        setSelectedReservation(null);
                    }
                }}
                parking={selectedSpot}
                onReserve={(id) => {
                    setSelectedSpot(null);
                    setSelectedReservation(null);
                    handleReserve(id);
                }}
                reservation={selectedReservation}
                onCancelReservation={handleCancelReservationFromDialog}
            />
        </div>
    );
}
