import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bee } from './Bee';
import { IcClose, IcDrop } from './Icons';

const SEEN_KEY = 'dau-gia-guide-seen-v1';

/** Người chơi đã xem hướng dẫn lần đầu chưa (lưu riêng, không mất khi đặt lại dữ liệu demo) */
export function guideSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
export function markGuideSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* trình duyệt chặn lưu trữ: lần sau sẽ hiện lại, không sao */
  }
}

// ---------- Hình minh họa nhỏ ----------
type Tone = 'lead' | 'unique' | 'dup' | 'plain';
const TONE: Record<Tone, { bg: string; fg: string; bd: string }> = {
  lead: { bg: 'var(--lead)', fg: '#fff', bd: 'var(--lead)' },
  unique: { bg: 'var(--honey-soft)', fg: 'var(--honey-text-strong)', bd: 'var(--honey-deep)' },
  dup: { bg: 'var(--dup-soft)', fg: 'var(--dup-text)', bd: 'var(--dup)' },
  plain: { bg: '#fff', fg: 'var(--ink)', bd: 'var(--line)' },
};

function PriceRow({ price, who, tag, tone }: { price: string; who: string; tag: string; tone: Tone }) {
  const t = TONE[tone];
  return (
    <div className="row" style={{ gap: 10, padding: '8px 12px', borderRadius: 12, background: t.bg, color: t.fg, border: `2px solid ${t.bd}` }}>
      <b className="display" style={{ fontSize: 18, minWidth: 74 }}>
        {price}
      </b>
      <span className="grow" style={{ fontSize: 13, opacity: 0.9 }}>
        {who}
      </span>
      <b style={{ fontSize: 12, letterSpacing: '0.02em' }}>{tag}</b>
    </div>
  );
}

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'var(--honey-soft)',
          border: '2px solid var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 17,
          fontWeight: 800,
        }}
      >
        {icon}
      </div>
      <div className="col" style={{ gap: 2 }}>
        <b style={{ fontSize: 15 }}>{title}</b>
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--muted)' }}>{children}</span>
      </div>
    </div>
  );
}

const Dot = ({ c }: { c: string }) => <span style={{ width: 14, height: 14, borderRadius: 7, background: c, display: 'inline-block' }} />;

// ---------- Nội dung từng trang ----------
interface Page {
  title: string;
  body: ReactNode;
}

const PAGES: Page[] = [
  {
    title: 'Săn đồ xịn, giá bình dân',
    body: (
      <div className="col" style={{ gap: 14, alignItems: 'center', textAlign: 'center' }}>
        <Bee size={116} mood="joy" />
        <p style={{ fontSize: 15.5, lineHeight: 1.55 }}>
          Mỗi phòng có một món quà. Bạn đoán một mức giá. Khi hết giờ, ai đưa ra <b>giá thấp nhất mà không trùng với ai</b> sẽ thắng và{' '}
          <b>nhận quà miễn phí</b>.
        </p>
        <div className="pill" style={{ background: 'var(--honey-soft)', color: 'var(--honey-text-strong)', fontSize: 13, fontWeight: 700 }}>
          Không mất tiền · chỉ dùng giọt mật
        </div>
      </div>
    ),
  },
  {
    title: 'Thấp nhất và duy nhất',
    body: (
      <div className="col" style={{ gap: 10 }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.5 }}>Ví dụ lúc gõ búa có các giá sau:</p>
        <PriceRow price="1.000đ" who="2 người chọn" tag="BỊ TRÙNG" tone="dup" />
        <PriceRow price="1.500đ" who="chỉ 1 người" tag="THẮNG" tone="lead" />
        <PriceRow price="2.000đ" who="chỉ 1 người" tag="DUY NHẤT" tone="unique" />
        <PriceRow price="3.000đ" who="3 người chọn" tag="BỊ TRÙNG" tone="dup" />
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
          1.000đ thấp nhất nhưng có 2 người chọn nên bị loại. Người chọn <b style={{ color: 'var(--ink)' }}>1.500đ</b> thắng.
        </p>
      </div>
    ),
  },
  {
    title: 'Ra giá bằng giọt mật',
    body: (
      <div className="col" style={{ gap: 14 }}>
        <Point icon={<IcDrop size={18} color="#1C1712" />} title="Mỗi lần ra giá tốn 1 giọt mật">
          Ra giá bao nhiêu lần cũng được, mỗi lần một mức khác nhau. Càng nhiều giá, càng nhiều cơ hội.
        </Point>
        <Point icon="₫" title="Kiếm giọt mật từ ngân hàng">
          Chuyển khoản, thanh toán QR, trả hóa đơn, mở tiết kiệm… hoặc đổi điểm Loyalty. Giọt mật không bán bằng tiền.
        </Point>
        <Point icon="±" title="Giá đi theo bước">
          Mỗi phòng có bước giá riêng (ví dụ 500đ) và giá cao nhất bằng giá trị món quà. Dùng nút −/+ hoặc thanh kéo cho nhanh.
        </Point>
      </div>
    ),
  },
  {
    title: 'Đọc tình hình và dùng công cụ',
    body: (
      <div className="col" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 8, padding: 12, background: '#fff', borderRadius: 14, border: '1.5px solid var(--line)' }}>
          <div className="row" style={{ gap: 10 }}>
            <Dot c="var(--lead)" />
            <span style={{ fontSize: 14 }}>
              <b>Dẫn đầu</b>: giá của bạn đang thấp nhất và duy nhất
            </span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Dot c="var(--honey-deep)" />
            <span style={{ fontSize: 14 }}>
              <b>Duy nhất</b>: chưa ai trùng nhưng đã có giá thấp hơn
            </span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Dot c="var(--dup)" />
            <span style={{ fontSize: 14 }}>
              <b>Bị trùng</b>: có người chọn giống bạn, hãy ra giá khác
            </span>
          </div>
        </div>
        <Point icon="🔍" title="Soi vùng giá">
          Xem quanh một con số, mức giá nào còn trống. Bấm mức trống để chọn luôn.
        </Point>
        <Point icon="🌡" title="Nhiệt kế">
          Giá dẫn đầu đang ở vùng thấp, giữa hay cao. Có lượt miễn phí mỗi phiên.
        </Point>
      </div>
    ),
  },
  {
    title: 'Ngai vàng và sự kiện bất ngờ',
    body: (
      <div className="col" style={{ gap: 14 }}>
        <Point icon="👑" title="Ngồi ngai càng lâu càng nhiều điểm">
          Đang dẫn đầu là bạn ngồi <b>Ngai vàng</b>. Đồng hồ đếm thời gian giữ ngai; qua mỗi mốc được thưởng điểm săn, phá kỷ lục của tổ được thưởng thêm.
        </Point>
        <Point icon="🌙" title="Màn đêm">
          Mọi trạng thái bị ẩn một lúc, công cụ tạm khóa. Ai cũng phải ra giá mù, trời sáng mới biết ai trùng.
        </Point>
        <Point icon="👁" title="Hé lộ">
          Hệ thống công bố một vùng giá đang có nhiều giá trùng. Cả tổ cùng thấy, tranh thủ né đi!
        </Point>
        <Point icon="🌧" title="Mưa điểm">
          Mỗi giá ra trong lúc mưa được thêm điểm săn. Sự kiện đến bất ngờ và áp dụng như nhau cho mọi người trong tổ.
        </Point>
      </div>
    ),
  },
  {
    title: 'Giây cuối và gõ búa',
    body: (
      <div className="col" style={{ gap: 14 }}>
        <Point icon="❄" title="Đóng băng những giây cuối">
          Gần hết giờ, trạng thái ngừng cập nhật. Bạn vẫn ra giá được nhưng không biết ai trùng, ai dẫn đầu — hồi hộp tới phút chót.
        </Point>
        <Point icon="🃏" title="Gõ búa, lật bài">
          Búa gõ xong, các mức giá được lật lần lượt từ thấp lên: mức trùng bị loại, mức <b>duy nhất</b> đầu tiên thắng. Kết quả kèm mã kiểm chứng và bảng giá ẩn danh.
        </Point>
        <Point icon="🍯" title="Không ai duy nhất?">
          Quà được dồn vào <b>Hũ mật</b> cho phiên sau (phòng có Hũ mật sẽ phát sáng ở sảnh), hoặc phiên bị hủy tùy loại quà.
        </Point>
      </div>
    ),
  },
  {
    title: 'Lên hạng, mở phòng mới',
    body: (
      <div className="col" style={{ gap: 14 }}>
        <Point icon="🏆" title="Hạng theo mùa">
          Tham gia và giữ ngôi dẫn đầu để có điểm săn: Đồng → Bạc → Vàng → Kim Cương. Hạng cao có thêm lượt công cụ.
        </Point>
        <Point icon="👑" title="Phòng VIP và Tổ Bí Mật">
          Phòng VIP cần hạng Vàng trở lên. Tổ Bí Mật xuất hiện bất ngờ — bấm để bật báo khi phòng mở.
        </Point>
        <Point icon="?" title="Cần xem lại?">
          Bấm nút <b>?</b> ở góc trên bên phải bất cứ lúc nào.
        </Point>
      </div>
    ),
  },
];

/** Hướng dẫn luật chơi: tự hiện lần đầu, mở lại bằng nút ? */
export function GuideModal({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const last = i === PAGES.length - 1;
  const bodyRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const close = () => {
    markGuideSeen();
    onClose();
  };
  const go = (n: number) => setI(Math.max(0, Math.min(PAGES.length - 1, n)));

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setI((v) => Math.min(PAGES.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = PAGES[i];
  return (
    <div className="overlay guide" role="dialog" aria-modal="true" aria-label="Hướng dẫn chơi">
      <div className="overlay-bg" onClick={close} />
      <div
        className="modal guide-card"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="row between">
          <span className="badge" style={{ background: 'var(--ink)', color: 'var(--honey)' }}>
            LUẬT CHƠI · {i + 1}/{PAGES.length}
          </span>
          <button className="icon-btn light" style={{ width: 36, height: 36 }} aria-label="Đóng hướng dẫn" onClick={close}>
            <IcClose size={18} />
          </button>
        </div>
        <h2 className="display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>
          {page.title}
        </h2>
        <div ref={bodyRef} className="guide-body" key={i}>
          {page.body}
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 6 }} role="tablist" aria-label="Trang hướng dẫn">
          {PAGES.map((p, n) => (
            <button
              key={n}
              role="tab"
              aria-selected={n === i}
              aria-label={`Trang ${n + 1}: ${p.title}`}
              className="guide-dot"
              data-on={n === i}
              onClick={() => go(n)}
            />
          ))}
        </div>
        <div className="row" style={{ gap: 10 }}>
          {i > 0 ? (
            <button className="btn outline sm" style={{ flex: 1 }} onClick={() => go(i - 1)}>
              Trước
            </button>
          ) : (
            <button className="btn link" style={{ flex: 1 }} onClick={close}>
              Bỏ qua
            </button>
          )}
          <button className="btn big" style={{ flex: 2, height: 50, fontSize: 18 }} onClick={() => (last ? close() : go(i + 1))}>
            {last ? 'Vào săn thôi!' : 'Tiếp'}
          </button>
        </div>
      </div>
    </div>
  );
}
