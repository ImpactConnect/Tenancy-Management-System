import requests
import json

BASE_URL = 'http://localhost:5000'

def test_routes():
    # Test root endpoint
    print("\nTesting root endpoint...")
    response = requests.get(f'{BASE_URL}/')
    print_response(response)

    # Test API endpoints
    endpoints = [
        '/api/dashboard/stats',
        '/api/tenants',
        '/api/properties',
        '/api/landlords',
        '/api/payments',
        '/api/documents',
        '/api/notifications'
    ]
    
    for endpoint in endpoints:
        print(f"\nTesting {endpoint}...")
        response = requests.get(f'{BASE_URL}{endpoint}')
        print_response(response)

def print_response(response):
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")

if __name__ == '__main__':
    test_routes() 