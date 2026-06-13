from rest_framework import serializers
from .models import Activity, User, UserProfile, Transaction, Notification
from .carbon_engine import calculate_carbon


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ['id', 'platform', 'duration', 'carbon', 'created_at']
        read_only_fields = ['carbon', 'created_at']

    def create(self, validated_data):
        request = self.context['request']

        platform = validated_data['platform']
        duration = validated_data['duration']

        carbon_value = calculate_carbon(platform, duration)

        return Activity.objects.create(
            user=request.user,
            platform=platform,
            duration=duration,
            carbon=carbon_value
        )
    

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['cash_balance', 'credits_owned', 'total_retired_offset']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'project_id', 'project_name', 'transaction_type', 'quantity', 'total_value', 'created_at']
        read_only_fields = ['created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'type', 'is_read', 'created_at']