import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { MapPin, Clock, Star, Car } from "lucide-react";

export interface ParkingSpot {
    id: number;
    title: string;
    description?: string;
    address: string;
    lat: number;
    lng: number;
    price: number;
    is_active: boolean;
    products?: any[];
    images?: { id: number; image: string }[]; // New images array
    // Computed/Optional
    image?: string; // Fallback
    distance?: string;
    rating?: number;
    reviews?: number;
    type?: string;
}

interface ParkingCardProps {
    parking: ParkingSpot;
    onReserve: (id: number) => void;
    onClick?: (parking: ParkingSpot) => void;
}

export function ParkingCard({ parking, onReserve, onClick }: ParkingCardProps) {
    // Mock data for missing backend fields
    const displayPrice = parking.products?.[0]?.price || parking.price || 0;
    const displayType = parking.products?.[0]?.type === 'HOURLY' ? '시간제' : '일일권';

    // Determine valid image source
    // Prioritize new 'images' array, fallback to old 'image' field, then default placeholder
    let imageSrc = "/images/placeholder-car.png";
    if (parking.images && parking.images.length > 0) {
        imageSrc = parking.images[0].image;
    } else if (parking.image) {
        imageSrc = parking.image;
    }

    // Ensure image path is absolute if it comes from backend (starts with /media)
    const secureImageSrc = imageSrc.startsWith("http") || imageSrc.startsWith("/images")
        ? imageSrc
        : `${process.env.NEXT_PUBLIC_API_URL}${imageSrc}`;

    return (
        <Card
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onClick && onClick(parking)}
        >
            <div className="relative h-48 bg-gray-200">
                <img
                    src={secureImageSrc}
                    alt={parking.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/placeholder-car.png";
                    }}
                />
                {parking.is_active ? (
                    <Badge className="absolute top-3 right-3 bg-green-500">예약 가능</Badge>
                ) : (
                    <Badge className="absolute top-3 right-3 bg-red-500">예약 마감</Badge>
                )}
            </div>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{parking.title}</h3>
                    <div className="flex gap-1 flex-wrap justify-end flex-1 ml-2">
                        {parking.products && parking.products.length > 0 ? (
                            parking.products.map((p) => (
                                <Badge key={p.id} variant="outline" className="whitespace-nowrap">
                                    {p.type === 'HOURLY' ? '시간제' : '일일권'}
                                </Badge>
                            ))
                        ) : (
                            <Badge variant="outline">{displayType}</Badge>
                        )}
                    </div>
                </div>

                <div className="flex items-center text-sm text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{parking.address}</span>
                </div>

                {/* Distance mock */}
                <div className="flex items-center text-sm text-gray-700 mb-1">
                    <Car className="w-4 h-4 mr-1" />
                    <span>500m</span>
                </div>

                <div className="flex items-center text-sm text-gray-700 mb-3">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>24시간 운영</span>
                </div>

                <div className="flex items-center mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 stroke-yellow-400 mr-1" />
                    <span className="font-semibold mr-1">{parking.rating ?? 0.0}</span>
                    <span className="text-sm text-gray-700">({parking.reviews ?? 0})</span>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        {parking.products && parking.products.length > 0 ? (
                            parking.products.map((p) => (
                                <div key={p.id} className="flex items-baseline gap-1">
                                    <span className="font-bold text-lg text-gray-900">{p.price.toLocaleString()}원</span>
                                    <span className="text-sm text-gray-700">/{p.type === 'HOURLY' ? '시간' : '일'}</span>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-lg text-gray-900">{displayPrice.toLocaleString()}원</span>
                                <span className="text-sm text-gray-700">/단위</span>
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            onReserve(parking.id);
                        }}
                        disabled={!parking.is_active}
                    >
                        예약하기
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
