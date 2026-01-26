"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as API from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash } from "lucide-react";
import NaverMap from "@/app/components/naver-map";
import { use } from "react";

export default function SpaceEditPage({ params }: { params: Promise<{ id: string }> }) {
    // Unanwrap params
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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
    const [existingImages, setExistingImages] = useState<any[]>([]);
    const [productTypes, setProductTypes] = useState<string[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // We use getSpaces({ mine: true }) to find the specific space since we don't have getSpace(id) yet
                // Alternatively we could add getSpace(id) to API.
                // Or use existing getSpaces and filter.
                // Ideally backend should support /spaces/id/ for owner.
                // Let's assume we can fetch list and find it.
                const spaces = await API.getSpaces({ mine: true });
                const space = spaces.find((s: any) => s.id === parseInt(id));

                if (!space) {
                    toast.error("주차장 정보를 찾을 수 없습니다.");
                    router.push("/host");
                    return;
                }

                setFormData({
                    title: space.title,
                    description: space.description || "",
                    address: space.address,
                    lat: space.lat,
                    lng: space.lng,
                    is_auto_approval: space.is_auto_approval ?? true
                });

                if (space.images) setExistingImages(space.images);

                // Parse Products
                const types: string[] = [];
                if (space.products) {
                    setProducts(space.products);
                    space.products.forEach((p: any) => {
                        types.push(p.type);
                        if (p.type === 'HOURLY') setHourlyPrice(p.price.toString());
                        if (p.type === 'DAY_PASS') setDayPassPrice(p.price.toString());
                    });
                    setProductTypes(types);
                }

            } catch (e) {
                console.error(e);
                toast.error("정보를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, router]);

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
            // Count existing + new
            if (filesArray.length + imageFiles.length + existingImages.length > 3) {
                toast.error("사진은 최대 3장까지 등록 가능합니다.");
                return;
            }
            setImageFiles(prev => [...prev, ...filesArray]);
        }
    };

    const removeImage = async (e: React.MouseEvent, index: number, isExisting: boolean, imageId?: number) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling
        console.log("removeImage called:", { index, isExisting, imageId });

        if (isExisting && imageId) {
            if (!window.confirm("이 사진을 삭제하시겠습니까? 복구할 수 없습니다.")) return;
            try {
                // calls top-level imported function
                console.log("Calling deleteSpaceImage with:", parseInt(id as string), imageId);
                await API.deleteSpaceImage(parseInt(id as string), imageId);
                setExistingImages(prev => prev.filter((_, i) => i !== index));
                toast.success("사진이 삭제되었습니다.");
            } catch (e: any) {
                console.error("Delete image error:", e);
                toast.error("사진 삭제에 실패했습니다: " + (e.response?.data?.detail || e.message));
            }
        } else {
            setImageFiles(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Logic similar to register but using updateSpace
            const newProducts = [];
            // We need to manage product IDs if we want to update existing ones, 
            // but simple approach: Send all config and let backend handle (or delete/create).
            // DRF nested writable serializers usually want IDs for updates.
            // Our simple implementation might create duplicates if we are not careful.
            // Let's see SpaceProductViewSet.
            // Actually, for MVP, we might just update title/desc/address/price.

            // Construct payload
            const formDataToSubmit = new FormData();
            formDataToSubmit.append('title', formData.title);
            formDataToSubmit.append('description', formData.description);
            formDataToSubmit.append('address', formData.address);
            formDataToSubmit.append('lat', formData.lat.toString());
            formDataToSubmit.append('lng', formData.lng.toString());
            formDataToSubmit.append('is_auto_approval', formData.is_auto_approval.toString());

            // Handle Products update: 
            // Ideally we send a List of dicts. If they have ID, it updates.
            // If we want to replace, we might need a custom view logic or 'update' on nested.
            // Let's assume user just wants to update PRICES for existing types or ADD new types.
            // We will do a best effort.

            const productsPayload = [];
            if (productTypes.includes('HOURLY')) {
                // Check if we already had it
                const existing = products.find(p => p.type === 'HOURLY');
                productsPayload.push({
                    id: existing?.id, // Include ID if exists
                    type: 'HOURLY',
                    name: '시간당 주차',
                    price: parseInt(hourlyPrice),
                    is_active: true
                });
            }
            if (productTypes.includes('DAY_PASS')) {
                const existing = products.find(p => p.type === 'DAY_PASS');
                productsPayload.push({
                    id: existing?.id,
                    type: 'DAY_PASS',
                    name: '일일 주차',
                    price: parseInt(dayPassPrice),
                    is_active: true
                });
            }

            formDataToSubmit.append('products', JSON.stringify(productsPayload));

            // Allow adding new images
            imageFiles.forEach((file) => {
                formDataToSubmit.append('images', file);
            });

            await API.updateSpace(parseInt(id), formDataToSubmit);
            toast.success("주차장 정보가 수정되었습니다.");
            router.push("/?mode=host");
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 401) {
                toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
                router.push("/login");
            } else {
                toast.error("수정 실패: " + (error.response?.data?.detail || "오류 발생"));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-blue-900">주차장 정보 수정</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">주차장 이름</Label>
                            <Input
                                id="title"
                                required
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
                            <div className="h-48 bg-gray-100 rounded-md overflow-hidden mt-2 relative">
                                <NaverMap
                                    center={{ lat: formData.lat, lng: formData.lng }}
                                    zoom={16}
                                    markers={[{ lat: formData.lat, lng: formData.lng, title: "선택된 위치" }]}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>주차장 사진</Label>
                            <div className="flex gap-4 mb-2">
                                {/* Existing Images */}
                                {existingImages.map((img, index) => (
                                    <div key={`exist-${index}`} className="relative w-24 h-24 border rounded overflow-hidden">
                                        <img
                                            src={img.image.startsWith('http') ? img.image : process.env.NEXT_PUBLIC_API_URL + img.image}
                                            alt={`Existing ${index}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => removeImage(e, index, true, img.id)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md hover:bg-red-600 z-10"
                                        >
                                            <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* New Images */}
                                {imageFiles.map((file, index) => (
                                    <div key={`new-${index}`} className="relative w-24 h-24 border rounded overflow-hidden">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Preview ${index}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => removeImage(e, index, false)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md z-10"
                                        >
                                            <Trash className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {existingImages.length + imageFiles.length < 3 && (
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
                            <p className="text-xs text-gray-400">* 기존 사진 삭제는 지원되지 않습니다.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">설명</Label>
                            <Textarea
                                id="description"
                                required
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

                        {/* Pricing (Simplified for edit - just updating prices if exists) */}
                        <div className="space-y-2">
                            <Label>요금제 수정</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-4 rounded-md bg-white">
                                    <div className="flex items-start space-x-2 mb-3">
                                        <input
                                            type="checkbox"
                                            checked={productTypes.includes('HOURLY')}
                                            onChange={(e) => handleProductTypeChange('HOURLY', e.target.checked)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label>시간제 (Hourly)</Label>
                                        </div>
                                    </div>
                                    {productTypes.includes('HOURLY') && (
                                        <div className="mt-2">
                                            <Label className="text-sm">시간당 가격 (원)</Label>
                                            <Input
                                                type="number"
                                                step="100"
                                                value={hourlyPrice}
                                                onChange={(e) => setHourlyPrice(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="border p-4 rounded-md bg-white">
                                    <div className="flex items-start space-x-2 mb-3">
                                        <input
                                            type="checkbox"
                                            checked={productTypes.includes('DAY_PASS')}
                                            onChange={(e) => handleProductTypeChange('DAY_PASS', e.target.checked)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label>일일권 (Day Pass)</Label>
                                        </div>
                                    </div>
                                    {productTypes.includes('DAY_PASS') && (
                                        <div className="mt-2">
                                            <Label className="text-sm">1일 가격 (원)</Label>
                                            <Input
                                                type="number"
                                                step="1000"
                                                value={dayPassPrice}
                                                onChange={(e) => setDayPassPrice(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        <div className="flex gap-3">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>취소</Button>
                            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin" /> : "수정 저장"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
