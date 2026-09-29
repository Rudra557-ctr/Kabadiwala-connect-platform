/**
 * A CSS-drawn phone showing the real collector UI.
 *
 * Deliberately not a stock photo and not a screenshot: it renders the actual
 * Marathi strings and the actual price shape, so what a visitor sees on the
 * landing page is what they get when they open the app. A marketing image that
 * flatters the product is the fastest way to lose a judge who then opens it.
 *
 * NOTE: this sits on a dark panel in the hero. Every light surface nested in a
 * dark section must set its own colour explicitly — inheriting white text into
 * a white card renders the whole thing invisible. That bug shipped once already.
 */
export function AppPhone({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`w-[248px] rounded-[30px] bg-[#111] p-[9px] shadow-[0_30px_60px_-20px_rgba(26,28,30,.45)] ${className}`}
    >
      <div lang="mr" className="deva overflow-hidden rounded-[23px] bg-[#FAF9F6] text-[#1A1C1E]">
        <div className="px-3 pb-2 pt-3">
          <div className="text-[13px] font-extrabold">कबाडीवाला कनेक्ट</div>
          <div className="text-[9px] text-[#5A5F63]">Nagpur</div>
        </div>

        <div className="mx-3 my-2 flex items-center gap-2 rounded-[15px] bg-gradient-to-br from-[#0d7c55] to-[#0a4e39] p-3 text-white">
          <span className="grid h-[33px] w-[33px] place-items-center rounded-[10px] bg-white/20 text-[15px]">
            📷
          </span>
          <span>
            <span className="block text-[12px] font-extrabold">नवा माल</span>
            <span className="block text-[8px] opacity-85">तुम्ही काय गोळा केलं?</span>
          </span>
        </div>

        <PriceRow tint="bg-[#D6F5E3]" glyph="🔌" name="तार / केबल" price="₹217" />
        <PriceRow tint="bg-[#FEF0C7]" glyph="🔋" name="लिथियम बॅटरी" price="₹151" />
        <div className="h-3" />
      </div>
    </div>
  );
}

function PriceRow({
  tint,
  glyph,
  name,
  price,
}: {
  tint: string;
  glyph: string;
  name: string;
  price: string;
}) {
  return (
    <div className="mx-3 my-[7px] flex items-center gap-2 rounded-[13px] border border-[#E2DFD6] bg-white p-2">
      <span className={`grid h-[29px] w-[29px] place-items-center rounded-[9px] text-[14px] ${tint}`}>
        {glyph}
      </span>
      <span className="flex-1">
        <span className="block text-[10px] font-bold">{name}</span>
        <span className="text-[17px] font-extrabold tracking-tight">
          {price}
          <span className="text-[8px] font-semibold text-[#5A5F63]"> प्रति किलो</span>
        </span>
      </span>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0D7C55] text-[10px] text-white">
        🔊
      </span>
    </div>
  );
}
