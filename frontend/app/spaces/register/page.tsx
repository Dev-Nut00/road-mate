"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerSpace } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash } from "lucide-react";

import NaverMap from "@/app/components/naver-map";

export default function SpaceRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        address: "",
        lat: 37.5665,
        lng: 126.9780,
        is_auto_approval: true,
    });

    // Pricing State
    const [hourlyPrice, setHourlyPrice] = useState("3000");
    const [dayPassPrice, setDayPassPrice] = useState("20000");

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [productTypes, setProductTypes] = useState<string[]>(['HOURLY']);

    const handleSearchAddress = () => {
        if (!formData.address) {
            toast.error("주소를 입력해주세요.");
            return;
        }

        if (!(window as any).naver || !(window as any).naver.maps || !(window as any).naver.maps.Service) {
            toast.error("네이버 지도 스크립트가 로드되지 않았습니다. 새로고침 해주세요.");
            return;
        }

        (window as any).naver.maps.Service.geocode({
            query: formData.address
        }, function (status: any, response: any) {
            if (status !== (window as any).naver.maps.Service.Status.OK) {
                toast.error("주소를 찾을 수 없습니다.");
                return;
            }

            const result = response.v2.addresses;
            if (result.length > 0) {
                setSearchResults(result);
                if (result.length === 1) {
                    selectAddress(result[0]);
                }
            } else {
                toast.error("검색 결과가 없습니다.");
            }
        });
    };

    const selectAddress = (item: any) => {
        setFormData(prev => ({
            ...prev,
            address: item.roadAddress || item.jibunAddress,
            lat: parseFloat(item.y),
            lng: parseFloat(item.x)
        }));
        setSearchResults([]);
        toast.success("위치가 설정되었습니다.");
    };

    const handleProductTypeChange = (type: string, checked: boolean) => {
        if (checked) {
            setProductTypes(prev => [...prev, type]);
        } else {
            setProductTypes(prev => prev.filter(t => t !== type));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            if (filesArray.length + imageFiles.length > 3) {
                toast.error("사진은 최대 3장까지 등록 가능합니다.");
                return;
            }
            setImageFiles(prev => [...prev, ...filesArray]);
        }
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (productTypes.length === 0) {
            toast.error("최소 하나의 요금제를 선택해주세요.");
            return;
        }
        setLoading(true);

        try {
            const products = [];
            if (productTypes.includes('HOURLY')) {
                products.push({
                    type: 'HOURLY',
                    name: '시간당 주차',
                    price: parseInt(hourlyPrice),
                    is_active: true
                });
            }
            if (productTypes.includes('DAY_PASS')) {
                products.push({
                    type: 'DAY_PASS',
                    name: '일일 주차',
                    price: parseInt(dayPassPrice),
                    is_active: true
                });
            }

            const availability_rules = [
                { day_of_week: 0, start_time: "00:00", end_time: "23:59" },
                { day_of_week: 1, start_time: "00:00", end_time: "23:59" },
                { day_of_week: 2, start_time: "00:00", end_time: "23:59" },
                { day_of_week: 3, start_time: "00:00", end_time: "23:59" },
                { day_of_week: 4, start_time: "00:00", end_time: "23:59" },
                { day_of_week: 5, start_time: "00:00", end_time: "23:59" },
                { day_of_week: 6, start_time: "00:00", end_time: "23:59" },
            ];

            const formDataToSubmit = new FormData();
            formDataToSubmit.append('title', formData.title);
            formDataToSubmit.append('description', formData.description);
            formDataToSubmit.append('address', formData.address);
            formDataToSubmit.append('lat', formData.lat.toString());
            formDataToSubmit.append('lng', formData.lng.toString());
            formDataToSubmit.append('is_active', 'true');
            formDataToSubmit.append('is_auto_approval', formData.is_auto_approval.toString());

            // Serialize complex objects
            formDataToSubmit.append('products', JSON.stringify(products));
            formDataToSubmit.append('availability_rules', JSON.stringify(availability_rules));

            imageFiles.forEach((file) => {
                formDataToSubmit.append('images', file);
            });

            await registerSpace(formDataToSubmit);
            toast.success("주차장이 성공적으로 등록되었습니다!");
            router.push("/?mode=host");
        } catch (error: any) {
            console.error(error);
            toast.error("등록 실패: " + (error.response?.data?.detail || "알 수 없는 오류"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-blue-900">내 주차장 등록</CardTitle>
                    <CardDescription className="text-center">호스트가 되어 유휴 공간을 공유해보세요.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">주차장 이름</Label>
                            <Input
                                id="title"
                                required
                                placeholder="예: 강남역 5분거리 넓은 주차공간"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>


                        <div className="space-y-2">
                            <Label htmlFor="address">주소</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="address"
                                    required
                                    placeholder="서울시 강남구 테헤란로 123"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                                <Button type="button" onClick={handleSearchAddress} variant="outline">
                                    주소 검색
                                </Button>
                            </div>
                            {searchResults.length > 0 && (
                                <ul className="bg-white border rounded-md max-h-40 overflow-y-auto mt-2">
                                    {searchResults.map((result, idx) => (
                                        <li
                                            key={idx}
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onClick={() => selectAddress(result)}
                                        >
                                            {result.roadAddress || result.jibunAddress}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {/* Mini Map Preview */}
                            <div className="h-48 bg-gray-100 rounded-md overflow-hidden mt-2 relative">
                                <NaverMap
                                    center={{ lat: formData.lat, lng: formData.lng }}
                                    zoom={16}
                                    markers={[{ lat: formData.lat, lng: formData.lng, title: "선택된 위치" }]}
                                />
                            </div>
                            <p className="text-xs text-gray-500">* 주소를 검색하여 선택하면 위경도가 자동 설정됩니다.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>주차장 사진 (최대 3장)</Label>
                            <div className="flex gap-4 mb-2">
                                {imageFiles.map((file, index) => (
                                    <div key={index} className="relative w-24 h-24 border rounded overflow-hidden">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Preview ${index}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md"
                                        >
                                            <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {imageFiles.length < 3 && (
                                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500 text-gray-400">
                                        <Plus className="w-6 h-6 mb-1" />
                                        <span className="text-xs">사진 추가</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">설명</Label>
                            <Textarea
                                id="description"
                                required
                                placeholder="주차장 상세 위치, 진입 방법, 특이사항 등을 적어주세요."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center space-x-2 border p-4 rounded-md bg-white">
                            <input
                                type="checkbox"
                                id="is_auto_approval"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={formData.is_auto_approval}
                                onChange={(e) => setFormData({ ...formData, is_auto_approval: e.target.checked })}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="is_auto_approval" className="text-base font-medium">예약 자동 승인</Label>
                                <p className="text-sm text-gray-500">
                                    체크하면 드라이버의 예약 요청이 즉시 확정됩니다. 체크 해제 시 호스트가 수동으로 승인해야 합니다.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>요금제 설정</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-4 rounded-md bg-white">
                                    <div className="flex items-start space-x-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="type-hourly"
                                            checked={productTypes.includes('HOURLY')}
                                            onChange={(e) => handleProductTypeChange('HOURLY', e.target.checked)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="type-hourly">시간제 (Hourly)</Label>
                                            <p className="text-xs text-gray-500">시간 단위로 요금을 부과합니다.</p>
                                        </div>
                                    </div>
                                    {productTypes.includes('HOURLY') && (
                                        <div className="mt-2">
                                            <Label htmlFor="price-hourly" className="text-sm">시간당 가격 (원)</Label>
                                            <Input
                                                id="price-hourly"
                                                type="number"
                                                min="0"
                                                step="100"
                                                value={hourlyPrice}
                                                onChange={(e) => setHourlyPrice(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="border p-4 rounded-md bg-white">
                                    <div className="flex items-start space-x-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="type-daypass"
                                            checked={productTypes.includes('DAY_PASS')}
                                            onChange={(e) => handleProductTypeChange('DAY_PASS', e.target.checked)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="type-daypass">일일권 (Day Pass)</Label>
                                            <p className="text-xs text-gray-500">하루 단위(00:00~23:59)로 요금을 부과합니다.</p>
                                        </div>
                                    </div>
                                    {productTypes.includes('DAY_PASS') && (
                                        <div className="mt-2">
                                            <Label htmlFor="price-daypass" className="text-sm">1일 가격 (원)</Label>
                                            <Input
                                                id="price-daypass"
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={dayPassPrice}
                                                onChange={(e) => setDayPassPrice(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    등록 중...
                                </>
                            ) : (
                                "주차장 등록 완료"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
