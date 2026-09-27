import { Component, type ReactNode } from 'react';

/** Hiện thông báo thay vì màn hình trắng khi có lỗi */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#1C1712', background: '#FFF6E0', minHeight: '100vh' }}>
        <h1 style={{ fontSize: 22 }}>Có lỗi khi chạy game</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>Bấm nút dưới để xóa dữ liệu demo và tải lại. Nếu vẫn lỗi, gửi dòng lỗi bên dưới cho nhóm phát triển.</p>
        <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', background: '#fff', padding: 12, borderRadius: 8 }}>{String(this.state.error?.message ?? this.state.error)}</pre>
        <button
          style={{ height: 48, padding: '0 20px', borderRadius: 12, border: '2px solid #1C1712', background: '#F5B301', fontWeight: 700, fontSize: 15 }}
          onClick={() => {
            try {
              localStorage.removeItem('mua-do-luxury-v1');
            } catch {
              /* bỏ qua */
            }
            location.reload();
          }}
        >
          Xóa dữ liệu và tải lại
        </button>
      </div>
    );
  }
}
