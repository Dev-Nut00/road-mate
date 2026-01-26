"use client";

import { useEffect, useState } from "react";
import { getMe, updateProfile } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import NaverMap from "@/app/components/naver-map";
import Script from "next/script";

declare global {
    interface Window {
        naver: any;
    }
}

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        phone_number: "",
        address: "",
    });

    // Address Search State
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [addressQuery, setAddressQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await getMe();
            setFormData({
                name: data.name || "",
                phone_number: data.phone_number || "",
                address: data.address || "",
            });
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast.error("정보를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateProfile(formData);
            toast.success("정보가 저장되었습니다.");
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error("저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    // Address Search Logic
    const handleAddressSearch = () => {
        if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
            toast.error("주소 검색 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        if (!addressQuery.trim()) {
            toast.error("검색할 주소를 입력해주세요.");
            return;
        }

        window.naver.maps.Service.geocode(
            { query: addressQuery },
            (status: any, response: any) => {
                if (status !== window.naver.maps.Service.Status.OK) {
                    toast.error("검색 중 오류가 발생했습니다.");
                    return;
                }

                const items = response.v2.addresses;
                if (items.length === 0) {
                    toast.error("검색 결과가 없습니다.");
                    setSearchResults([]);
                } else {
                    setSearchResults(items);
                    setIsSearchingAddress(true);
                }
            }
        );
    };

    const selectAddress = (address: any) => {
        setFormData((prev) => ({ ...prev, address: address.roadAddress || address.jibunAddress }));
        setSelectedLocation({
            lat: parseFloat(address.y),
            lng: parseFloat(address.x),
        });
        setIsSearchingAddress(false);
        setSearchResults([]);
        setAddressQuery("");
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">내 정보 수정</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Address Search Modal/Section */}
                    {isSearchingAddress && (
                        <div className="mb-6 border p-4 rounded-lg bg-gray-50">
                            <h3 className="font-bold mb-2">주소 검색 결과</h3>
                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                {searchResults.map((item, index) => (
                                    <li
                                        key={index}
                                        className="cursor-pointer hover:bg-gray-200 p-2 rounded text-sm"
                                        onClick={() => selectAddress(item)}
                                    >
                                        <p className="font-semibold">{item.roadAddress}</p>
                                        <p className="text-gray-500 text-xs">{item.jibunAddress}</p>
                                    </li>
                                ))}
                            </ul>
                            <Button variant="outline" size="sm" onClick={() => setIsSearchingAddress(false)} className="mt-2 w-full">닫기</Button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="홍길동"
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <Label htmlFor="phone_number">전화번호</Label>
                            <Input
                                id="phone_number"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                placeholder="010-1234-5678"
                            />
                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                            <Label htmlFor="address">주소</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="주소를 입력하거나 검색하세요"
                                />
                                <Button type="button" onClick={() => {
                                    setAddressQuery(formData.address);
                                    handleAddressSearch();
                                }}>
                                    주소 검색
                                </Button>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? "저장 중..." : "저장하기"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
