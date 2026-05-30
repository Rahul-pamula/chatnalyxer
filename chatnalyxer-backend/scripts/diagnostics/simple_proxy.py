import socket
import threading
import os
import sys

# Configuration
LOCAL_HOST = '127.0.0.1'
LOCAL_PORT = 8000
REMOTE_HOST = '127.0.0.1'
REMOTE_PORT = int(os.environ.get('PORT', 10000))

def handle_client(client_socket):
    try:
        remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        remote_socket.connect((REMOTE_HOST, REMOTE_PORT))
        
        def forward(src, dst):
            try:
                while True:
                    data = src.recv(4096)
                    if not data:
                        break
                    dst.sendall(data)
            except Exception:
                pass
            finally:
                dst.close()
                src.close()

        # Start bidirectional forwarding
        threading.Thread(target=forward, args=(client_socket, remote_socket), daemon=True).start()
        threading.Thread(target=forward, args=(remote_socket, client_socket), daemon=True).start()
        
    except Exception as e:
        print(f"❌ Proxy Connection Error: {e}")
        client_socket.close()

def start_proxy():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server.bind((LOCAL_HOST, LOCAL_PORT))
    except OSError as e:
        print(f"⚠️  Port {LOCAL_PORT} already in use. Maybe another instance is running? {e}")
        return

    server.listen(50)
    print(f"🔗 Python Proxy Started: {LOCAL_HOST}:{LOCAL_PORT} -> {REMOTE_HOST}:{REMOTE_PORT}")
    
    while True:
        try:
            client_socket, addr = server.accept()
            threading.Thread(target=handle_client, args=(client_socket,), daemon=True).start()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"❌ Proxy Accept Error: {e}")

if __name__ == "__main__":
    start_proxy()
