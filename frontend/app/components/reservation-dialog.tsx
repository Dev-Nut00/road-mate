import { getVehicles, createReservation } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { ParkingSpot } from "./parking-card";
import { MapPin, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import * as React from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner";

// Simple UI components
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
        ref={ref}
        {...props}
    />
))
Input.displayName = "Input"

const NativeSelect = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none" {...props}>
            {children}
        </select>
    </div>
)

interface ReservationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parking: ParkingSpot | null;
    onSuccess: () => void;
}

declare global {
    interface Window {
        NicePay: any;
        AUTHNICE: any;
    }
}

export function ReservationDialog({ open, onOpenChange, parking, onSuccess }: ReservationDialogProps) {
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [date, setDate] = useState<string>("");
    const [startTime, setStartTime] = useState<string>("");
    const [duration, setDuration] = useState<string>("");
    const [carNumber, setCarNumber] = useState<string>("");

    // Vehicle Selection State
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    // Fetch vehicles
    React.useEffect(() => {
        if (open) {
            getVehicles().then((data: any[]) => {
                setVehicles(data);
                // Pre-select first vehicle if available
                if (data.length > 0) {
                    setCarNumber(data[0].car_number);
                    setSelectedVehicleId(data[0].id);
                } else {
                    setSelectedVehicleId(null);
                    setCarNumber("");
                }
            }).catch((e: any) => {
                console.error("Failed to load vehicles", e);
            });
        }
    }, [open]);

    // Reset state when parking changes
    React.useEffect(() => {
        if (parking && parking.products && parking.products.length > 0) {
            setSelectedProductId(parking.products[0].id);
        }
    }, [parking]);

    if (!parking || !open) return null;

    const products = parking.products || [];
    const selectedProduct = products.find(p => p.id === selectedProductId) || products[0] || { price: 1000, id: 1, type: 'HOURLY' };
    const isDayPass = selectedProduct.type === 'DAY_PASS';

    // Calculate total price
    let totalPrice = 0;
    if (isDayPass) {
        totalPrice = selectedProduct.price;
    } else {
        totalPrice = duration ? Math.floor(selectedProduct.price * parseFloat(duration)) : 0;
    }


    const handlePaymentAndReserve = async () => {
        if (!date || !startTime || !carNumber) return;
        if (!isDayPass && !duration) return;

        setProcessing(true);

        const startDateTime = new Date(`${date}T${startTime}`);
        const effectiveDuration = isDayPass ? 24 : parseFloat(duration);
        const endDateTime = new Date(startDateTime.getTime() + effectiveDuration * 60 * 60 * 1000);

        const reservationPayload = {
            product_id: selectedProduct.id,
            start_at: startDateTime.toISOString(),
            end_at: endDateTime.toISOString(),
            parkingTitle: parking.title,
            totalPrice,
            carNumber,
            vehicle_id: selectedVehicleId
        };

        try {
            await createReservation(reservationPayload);
            toast.success("예약이 완료되었습니다!");
            onSuccess();
            onOpenChange(false);
        } catch (e: any) {
            console.error(e);
            toast.error("예약 생성 실패: " + (e.response?.data?.detail || e.message));
        } finally {
            setProcessing(false);
        }
    };

    // Get current date/time for restrictions
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const currentHour = now.getHours();

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 m-4 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">주차 공간 예약</h2>
                        <button onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">{parking.title}</h4>
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>{parking.address}</span>
                            </div>

                            {/* Product Selection */}
                            {products.length > 1 && (
                                <div className="flex gap-2 mb-2">
                                    {products.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedProductId(p.id)}
                                            className={cn(
                                                "flex-1 py-1 px-2 text-sm rounded-md border text-center transition-colors",
                                                selectedProductId === p.id
                                                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                            )}
                                        >
                                            {p.type === 'HOURLY' ? '시간제' : '일일권'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-2">
                                <span className="font-bold text-lg">{selectedProduct.price.toLocaleString()}원</span>
                                <span className="text-sm text-gray-600">/{selectedProduct.type === 'HOURLY' ? '시간' : '일'}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>예약 날짜</Label>
                            <Input
                                type="date"
                                value={date}
                                min={todayStr}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setStartTime("");
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>시작 시간</Label>
                            <NativeSelect value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                                <option value="">시간을 선택하세요</option>
                                {Array.from({ length: 24 }, (_, i) => {
                                    const isToday = date === todayStr;
                                    const isPast = isToday && i <= currentHour;
                                    if (isPast) return null;
                                    return (
                                        <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                            {`${i.toString().padStart(2, '0')}:00`}
                                        </option>
                                    );
                                })}
                            </NativeSelect>
                        </div>

                        {!isDayPass && (
                            <div className="space-y-2">
                                <Label>이용 시간 (시간)</Label>
                                <Input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    min="0.5"
                                    step="0.5"
                                    placeholder="예: 2.5"
                                />
                                <p className="text-xs text-gray-500">30분 단위로 입력 가능합니다. (예: 1.5)</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>차량 선택</Label>
                            {vehicles.length > 0 ? (
                                <div className="space-y-2">
                                    <NativeSelect
                                        value={selectedVehicleId || ''}
                                        onChange={(e) => {
                                            const vid = parseInt(e.target.value);
                                            const v = vehicles.find(veh => veh.id === vid);
                                            if (v) {
                                                setCarNumber(v.car_number);
                                                setSelectedVehicleId(v.id);
                                            }
                                        }}
                                    >
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.car_number} ({v.car_model || "모델명 없음"})
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                                    <p className="text-sm font-medium text-yellow-700 mb-3">등록된 차량이 없습니다</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                                        onClick={() => window.location.href = "/?mode=driver&tab=vehicles"}
                                    >
                                        차량 등록하러 가기
                                    </Button>
                                </div>
                            )}
                        </div>

                        {(isDayPass || duration) && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-700">총 결제 금액</span>
                                    <span className="font-bold text-xl text-blue-600">
                                        {totalPrice.toLocaleString()}원
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            취소
                        </Button>
                        <Button
                            onClick={handlePaymentAndReserve}
                            disabled={!date || !startTime || (!isDayPass && !duration) || !carNumber || processing}
                            className={cn(processing ? "opacity-70" : "")}
                        >
                            {processing ? "처리중..." : "예약하기"}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
