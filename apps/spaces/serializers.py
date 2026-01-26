import json
from rest_framework import serializers
from .models import Space, AvailabilityRule, SpaceProduct, SpaceImage

class SpaceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpaceImage
        fields = ['id', 'image', 'created_at']

class AvailabilityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityRule
        fields = ['id', 'day_of_week', 'start_time', 'end_time']
    
    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time.")
        return data

class SpaceProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpaceProduct
        fields = ['id', 'type', 'name', 'price', 'is_active']
    
    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be positive.")
        return value

class SpaceSerializer(serializers.ModelSerializer):
    availability_rules = AvailabilityRuleSerializer(many=True, required=False)
    products = SpaceProductSerializer(many=True, required=False)
    images = SpaceImageSerializer(many=True, read_only=True)

    class Meta:
        model = Space
        fields = ['id', 'host', 'title', 'description', 'address', 'lat', 'lng', 'is_active', 'is_auto_approval', 'created_at', 'images', 'products', 'availability_rules']
        read_only_fields = ['id', 'host', 'created_at', 'images', 'products']

    def validate(self, data):
        if 'lat' in data and not (-90 <= data['lat'] <= 90):
            raise serializers.ValidationError({'lat': 'Latitude must be between -90 and 90.'})
        if 'lng' in data and not (-180 <= data['lng'] <= 180):
            raise serializers.ValidationError({'lng': 'Longitude must be between -180 and 180.'})
        return data

    def to_internal_value(self, data):
        # Support multipart/form-data where complex fields are JSON strings
        if hasattr(data, 'dict'): # If QueryDict
            data = data.dict()
            
        if 'availability_rules' in data and isinstance(data['availability_rules'], str):
            try:
                data['availability_rules'] = json.loads(data['availability_rules'])
            except ValueError:
                pass
                
        if 'products' in data and isinstance(data['products'], str):
            try:
                data['products'] = json.loads(data['products'])
            except ValueError:
                pass
                
        return super().to_internal_value(data)

    def create(self, validated_data):
        rules_data = validated_data.pop('availability_rules', [])
        products_data = validated_data.pop('products', [])
        
        # Handle images separately since they come from request.FILES usually, 
        # but DRF might not pass them in validated_data if not in fields?
        # Actually in ModelSerializer.create, validated_data only has fields that are in serializer.
        # We need to access context['request'].FILES if we want to handle files manually here 
        # OR define 'images' as a writeable field but that's tricky with list of files.
        # Let's inspect context['request'].FILES directly.
        
        space = Space.objects.create(**validated_data)
        
        for rule_data in rules_data:
            AvailabilityRule.objects.create(space=space, **rule_data)
            
        for product_data in products_data:
            SpaceProduct.objects.create(space=space, **product_data)

        # Handle images
        request = self.context.get('request')
        if request and request.FILES:
            # multiple images with key 'images'
            for image_file in request.FILES.getlist('images'):
                 SpaceImage.objects.create(space=space, image=image_file)
            
        return space

    def update(self, instance, validated_data):
        rules_data = validated_data.pop('availability_rules', None)
        products_data = validated_data.pop('products', None)

        # Update direct fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Availability Rules (Safe to replace)
        if rules_data is not None:
             instance.availability_rules.all().delete()
             for rule_data in rules_data:
                 AvailabilityRule.objects.create(space=instance, **rule_data)
        
        # Update Products (Safe update/soft-delete)
        if products_data is not None:
            # Create a map by ID and by Type for flexible matching
            current_products_by_id = {p.id: p for p in instance.products.all()}
            current_products_by_type = {p.type: p for p in instance.products.all()}
            
            # Keep track of which IDs were processed to know what to soft-delete later
            processed_ids = set()

            for product_data in products_data:
                p_id = product_data.get('id')
                p_type = product_data.get('type')
                
                # Try to find existing product by ID first, then by Type
                product = None
                if p_id and p_id in current_products_by_id:
                    product = current_products_by_id[p_id]
                elif p_type and p_type in current_products_by_type:
                    product = current_products_by_type[p_type]
                
                if product:
                    # Update existing
                    processed_ids.add(product.id)
                    for attr, value in product_data.items():
                        if attr != 'id': # Don't update ID
                            setattr(product, attr, value)
                    product.is_active = True # Ensure active if in payload
                    product.save()
                else:
                    # Create new
                    if 'id' in product_data: del product_data['id'] 
                    new_product = SpaceProduct.objects.create(space=instance, **product_data)
                    processed_ids.add(new_product.id)
                    
            # Set remaining products to inactive (Soft Delete)
            for p_id, product in current_products_by_id.items():
                if p_id not in processed_ids:
                    product.is_active = False
                    product.save()

        # Handle images (Add only)
        request = self.context.get('request')
        if request and request.FILES:
            for image_file in request.FILES.getlist('images'):
                 SpaceImage.objects.create(space=instance, image=image_file)
                 
        return instance
