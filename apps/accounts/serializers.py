from rest_framework import serializers
from django.contrib.auth import get_user_model
import re

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'name', 'phone_number', 'address')

    def validate_username(self, value):
        # 1. Format Validation
        # 5~20 lowercase letters, numbers, -, _
        if not re.match(r'^[a-z0-9-_]{5,20}$', value):
             raise serializers.ValidationError("5~20자의 영문 소문자, 숫자와 특수기호 -, _ 만 사용 가능합니다.")
        
        # 2. Check for existence (though UniqueValidator does this, we want custom message)
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("사용할 수 없는 아이디입니다. 다른 아이디를 입력해 주세요.")
            
        return value

    def validate_password(self, value):
        # 8~16 chars, En (upper/lower), number, special chars
        # Allowed specials: ! " # $ % & ' ( ) * + , - . / : ; ? @ [ ＼ ] ^ _ ` { | } ~ \
        # Note: ＼ is full-width backslash? Or just backslash? Usually backslash \. 
        # The prompt says ＼ (U+FF3C) in brackets but \ at the end. I will assume standard ASCII special chars + the specified ones.
        # Actually, let's just implement a regex that matches the user requirement "8~16자 영문 대/소문자, 숫자, 특수문자만 사용 가능합니다."
        # And specifically allowed special chars.
        
        # Length check
        if not (8 <= len(value) <= 16):
            raise serializers.ValidationError("8~16자 영문 대/소문자, 숫자, 특수문자만 사용 가능합니다.")

        # Allowed chars check
        # Build set of allowed chars
        # English letters (a-zA-Z)
        # Numbers (0-9)
        # Special chars: ! " # $ % & ' ( ) * + , - . / : ; ? @ [ \ ] ^ _ ` { | } ~
        # Note: Backslash needs escaping in python string.
        allowed_specials = r"""!"#$%&'()*+,-./:;?@[\]^_`{|}~"""
        # Also need to handle space? Prompt didn't explicitly say space is allowed. "특수문자만" usually implies no spaces.
        
        # Regex pattern construction
        # ^[a-zA-Z0-9!\"#$%&'()*+,-./:;?@[\\\]^_`{|}~]+$
        # Let's be careful with escaping.
        
        # Check against regex
        pattern = r'^[a-zA-Z0-9!"#$%&\'()*+,\-./:;?@[\\\]^_`{|}~]+$'
        if not re.match(pattern, value):
             raise serializers.ValidationError("8~16자 영문 대/소문자, 숫자, 특수문자만 사용 가능합니다.")
             
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            is_host=True,
            is_driver=True,
            name=validated_data.get('name', ''),
            phone_number=validated_data.get('phone_number', ''),
            address=validated_data.get('address', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_host', 'is_driver', 
                  'name', 'phone_number', 'address', 'car_model', 'car_number')

from .models import Vehicle

class VehicleSerializer(serializers.ModelSerializer):
    car_model = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Vehicle
        fields = ('id', 'car_number', 'car_model', 'is_default')
        read_only_fields = ('id',)
