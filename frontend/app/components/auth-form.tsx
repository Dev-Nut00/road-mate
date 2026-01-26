"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { register, login } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
        ref={ref}
        {...props}
    />
))
Input.displayName = "Input"

export default function AuthForm({ onLoginSuccess }: { onLoginSuccess: (username: string) => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await login({ username, password });
                toast.success("로그인 성공!");
                onLoginSuccess(username);
            } else {
                // Client-side Validation
                const usernameRegex = /^[a-z0-9-_]{5,20}$/;
                // Password regex: 8-16 chars, allowed chars only.
                // Regex for allowed chars: letters, numbers, and specific special chars.
                // Escaping special regex chars: - ] \ ^
                const passwordRegex = /^[a-zA-Z0-9!"#$%&'()*+,\-./:;?@[\\\]^_`{|}~]{8,16}$/;

                if (!usernameRegex.test(username)) {
                    toast.error("아이디 형식이 올바르지 않습니다. (5~20자 소문자, 숫자, -, _)");
                    return;
                }

                if (!passwordRegex.test(password)) {
                    // Just showing general error as per requirement or specific?
                    // Let's match the required error message style roughly.
                    toast.error("비밀번호 형식이 올바르지 않습니다. (8~16자 영문, 숫자, 특수문자)");
                    return;
                }

                await register({
                    username,
                    password,
                    name,
                    phone_number: phone,
                    address
                });
                toast.success("회원가입 성공! 로그인해주세요.");
                setIsLogin(true);
            }
        } catch (error: any) {
            // Backend error message handling
            const detail = error.response?.data?.detail;
            const usernameError = error.response?.data?.username?.[0];
            const passwordError = error.response?.data?.password?.[0];

            if (usernameError) {
                toast.error(usernameError);
            } else if (passwordError) {
                toast.error(passwordError);
            } else {
                toast.error("오류 발생: " + (detail || error.message));
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">

            <Card className="w-full max-w-md p-6 bg-white shadow-xl rounded-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Road Mate</h1>
                    <p className="text-gray-500">{isLogin ? "서비스 이용을 위해 로그인하세요" : "새 계정을 만드세요"}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>사용자명</Label>
                        <Input
                            type="text"
                            placeholder="5~20자의 영문 소문자, 숫자, -, _"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        {!isLogin && (
                            <p className="text-xs text-gray-500">
                                * 5~20자의 영문 소문자, 숫자와 특수기호 -, _ 만 사용 가능합니다.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>비밀번호</Label>
                        <Input
                            type="password"
                            placeholder="8~16자 영문 대/소문자, 숫자, 특수문자"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {!isLogin && (
                            <p className="text-xs text-gray-500">
                                * 8~16자 영문 대/소문자, 숫자, 특수문자만 사용 가능합니다.
                                <br />
                                * 사용 가능 특수문자: ! " # $ % & ' ( ) * + , - . / : ; ? @ [ ＼ ] ^ _ ` {'{'} | {'}'} ~ \
                            </p>
                        )}
                    </div>
                    {!isLogin && (
                        <>
                            <div className="space-y-2">
                                <Label>이름</Label>
                                <Input
                                    type="text"
                                    placeholder="이름을 입력하세요"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>전화번호</Label>
                                <Input
                                    type="text"
                                    placeholder="010-0000-0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>주소</Label>
                                <Input
                                    type="text"
                                    placeholder="주소를 입력하세요"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <Button type="submit" className="w-full">
                        {isLogin ? "로그인" : "회원가입"}
                    </Button>
                </form >

                <div className="mt-4 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
                    </button>
                </div>
            </Card >
        </div >
    );
}
