import requests
import os
import base64
from django.conf import settings

class NicePayClient:
    API_BASE = "https://sandbox-api.nicepay.co.kr/v1"
    
    def __init__(self):
        # Fallback to test keys if not set in settings/env
        self.client_id = getattr(settings, 'NICEPAY_CLIENT_KEY', os.environ.get('NICEPAY_CLIENT_KEY', 'S2_2c2e2dd56fbd4f74833cf7a857702a29'))
        self.secret_key = getattr(settings, 'NICEPAY_SECRET_KEY', os.environ.get('NICEPAY_SECRET_KEY', '686799e734ee4906be693905987f885c'))
    
    def get_headers(self):
        # Basic Auth: client_id:secret_key base64 encoded
        credential = f"{self.client_id}:{self.secret_key}"
        encoded = base64.b64encode(credential.encode('utf-8')).decode('utf-8')
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Basic {encoded}'
        }

    def approve(self, tid, amount, order_id):
        """
        Approve payment after client-side authentication.
        POST /payments/{tid}
        """
        url = f"{self.API_BASE}/payments/{tid}"
        payload = {
            'amount': amount,
            'orderId': order_id,
        }
        
        try:
            response = requests.post(url, headers=self.get_headers(), json=payload, timeout=10)
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'resultCode': '9999', 'resultMsg': str(e)}

    def cancel(self, tid, amount, reason="User requested cancellation"):
        """
        Cancel payment.
        POST /payments/{tid}/cancel
        """
        url = f"{self.API_BASE}/payments/{tid}/cancel"
        payload = {
            'amount': amount,
            'reason': reason,
        }
        
        try:
            response = requests.post(url, headers=self.get_headers(), json=payload, timeout=10)
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'resultCode': '9999', 'resultMsg': str(e)}
