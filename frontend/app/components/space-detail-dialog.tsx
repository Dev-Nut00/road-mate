
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ParkingSpot } from "./parking-card";
import { MapPin, Clock, Star, Car, X, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import NaverMap from "@/app/components/naver-map";

interface SpaceDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parking: ParkingSpot | null;
    onReserve: (id: number) => void;
    reservation?: {
        id: number;
        status: string;
        date: string;
        startTime: string;
        duration: number;
        totalPrice: number;
        rawStartAt: string;
    } | null;
    onCancelReservation?: (id: number) => void;
}

export function SpaceDetailDialog({ open, onOpenChange, parking, onReserve, reservation, onCancelReservation }: SpaceDetailDialogProps) {
    const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

    if (!parking || !open) return null;

    // Aggregate all images: Priority New Array -> Old Field -> Placeholder
    let images: string[] = [];
    if (parking.images && parking.images.length > 0) {
        images = parking.images.map(img => img.image);
    } else if (parking.image) {
        images = [parking.image];
    } else {
        images = ["/images/placeholder-car.png"];
    }

    // Ensure absolute paths
    const secureImages = images.map(src =>
        src.startsWith("http") || src.startsWith("/images")
            ? src
            : `${process.env.NEXT_PUBLIC_API_URL}${src}`
    );

    const handleReserveClick = () => {
        onOpenChange(false);
        onReserve(parking.id);
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isConfirmingCancel) {
            if (reservation && onCancelReservation) {
                onCancelReservation(reservation.id);
            }
            setIsConfirmingCancel(false);
        } else {
            setIsConfirmingCancel(true);
        }
    };

    // Check if reservation can be canceled (2-hour rule)
    const isCancelable = reservation &&
        (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') &&
        (new Date(reservation.rawStartAt).getTime() - new Date().getTime()) >= 2 * 60 * 60 * 1000;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
        }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header / Image Gallery */}
                <div className="relative h-64 bg-gray-100 shrink-0">
                    {/* Main Image */}
                    <img
                        src={secureImages[0]}
                        alt={parking.title}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target as HTMLImageElement).src = "/images/placeholder-car.png"}
                    />

                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Image navigation or indicator could go here */}
                    {secureImages.length > 1 && (
                        <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                            1 / {secureImages.length}
                        </div>
                    )}
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{parking.title}</h2>
                            <div className="flex items-center text-gray-800 mt-1">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>{parking.address}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end mb-1">
                                <Star className="w-4 h-4 fill-yellow-400 stroke-yellow-400 mr-1" />
                                <span className="font-bold">4.5</span>
                                <span className="text-gray-600 text-sm ml-1">(120)</span>
                            </div>
                            {parking.is_active ? (
                                <Badge className="bg-green-500">예약 가능</Badge>
                            ) : (
                                <Badge className="bg-red-500">이용 불가</Badge>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Products / Pricing */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3">요금 정보</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {parking.products && parking.products.map((p, idx) => (
                                    <div key={idx} className="border rounded-lg p-3 bg-gray-50 flex justify-between items-center">
                                        <span className="font-medium text-gray-900">
                                            {p.type === 'HOURLY' ? '시간제' : '일일권'}
                                        </span>
                                        <span className="font-bold text-blue-600">
                                            {p.price.toLocaleString()}원
                                            <span className="text-xs text-gray-600 font-normal ml-1">
                                                /{p.type === 'HOURLY' ? '시간' : '일'}
                                            </span>
                                        </span>
                                    </div>
                                ))}
                                {(!parking.products || parking.products.length === 0) && (
                                    <div className="border rounded-lg p-3 bg-gray-50">
                                        <span className="text-gray-700">등록된 요금 정보가 없습니다.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="font-semibold text-lg mb-2">주차장 소개</h3>
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {parking.description || "등록된 소개글이 없습니다."}
                            </div>
                        </div>

                        {/* Images Grid (if more than 1) */}
                        {secureImages.length > 1 && (
                            <div>
                                <h3 className="font-semibold text-lg mb-3">사진 더보기</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {secureImages.slice(1).map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                                            <img
                                                src={img}
                                                alt={`Gallery ${idx}`}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                                onError={(e) => (e.target as HTMLImageElement).src = "/images/placeholder-car.png"}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amenities / Features (Mock) */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3">편의 시설 및 정보</h3>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary" className="px-3 py-1"><Car className="w-3 h-3 mr-1" /> 자주식 주차</Badge>
                                <Badge variant="secondary" className="px-3 py-1"><Clock className="w-3 h-3 mr-1" /> 24시간 운영</Badge>
                                <Badge variant="secondary" className="px-3 py-1"><Check className="w-3 h-3 mr-1" /> CCTV 설치</Badge>
                            </div>
                        </div>

                        {/* Location Map */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3">위치 안내</h3>
                            <div className="h-64 rounded-lg overflow-hidden border">
                                <NaverMap
                                    center={{ lat: parking.lat, lng: parking.lng }}
                                    zoom={16}
                                    markers={[{ lat: parking.lat, lng: parking.lng, title: parking.title }]}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t bg-gray-50 shrink-0">
                    {/* Show reservation info if viewing from reservations */}
                    {reservation && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">내 예약 정보</h4>
                            <div className="text-sm text-blue-800 space-y-1">
                                <p>📅 {reservation.date} {reservation.startTime}</p>
                                <p>⏱️ {reservation.duration}시간</p>
                                <p>💰 {reservation.totalPrice.toLocaleString()}원</p>
                                <p>📌 상태: {reservation.status === 'CONFIRMED' ? '확정' : reservation.status === 'PENDING' ? '대기중' : reservation.status}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => {
                            setIsConfirmingCancel(false);
                            onOpenChange(false);
                        }}>
                            닫기
                        </Button>
                        {reservation ? (
                            isCancelable && (
                                <button
                                    onClick={(e) => handleCancelClick(e)}
                                    className={cn(
                                        "px-8 py-2 font-medium rounded-md transition-colors text-white",
                                        isConfirmingCancel
                                            ? "bg-red-700 hover:bg-red-800 animate-in fade-in zoom-in-95"
                                            : "bg-red-500 hover:bg-red-600"
                                    )}
                                >
                                    {isConfirmingCancel ? "정말로 취소하시겠습니까?" : "예약 취소"}
                                </button>
                            )
                        ) : (
                            <Button onClick={handleReserveClick} disabled={!parking.is_active} className="px-8">
                                예약하기
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
