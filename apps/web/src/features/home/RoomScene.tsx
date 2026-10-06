import {
  HOME_SKINS,
  homeFootprint,
  type HomeDesign,
  type HomeItem,
  type HomePlacement,
} from "@bmt/shared";

const iso = (x: number, y: number) =>
  [310 + (x - y) * 32, 150 + (x + y) * 16] as const;
function diamond(x: number, y: number, w = 1, h = 1) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
    .map(([a, b]) => iso(a!, b!).join(","))
    .join(" ");
}

/** Procedural placeholders: replace this renderer with the sprite contract in the asset guide. */
export function PixelAvatar({
  design,
  catalog,
  x = 0,
  y = 0,
  scale = 1,
}: {
  design: HomeDesign;
  catalog: HomeItem[];
  x?: number;
  y?: number;
  scale?: number;
}) {
  const outfit = (slot: "hair" | "top" | "bottom" | "shoes" | "hat") =>
    catalog.find((i) => i.id === design.outfit[slot]);
  const hair = outfit("hair"),
    hat = outfit("hat"),
    top = outfit("top"),
    bottom = outfit("bottom"),
    shoes = outfit("shoes");
  const skin = HOME_SKINS[design.skin] ?? HOME_SKINS[3];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      shapeRendering="crispEdges"
    >
      <ellipse cy="0" rx="12" ry="5" fill="#25373a" opacity=".2" />
      <g transform="translate(-12 -48)">
        <path
          d="M6 32h8v14H6zM16 32h7v14h-7z"
          fill={bottom?.color ?? "#343e50"}
        />
        <path
          d="M4 44h10v4H4zM16 44h10v4H16z"
          fill={shoes?.color ?? "#302b36"}
        />
        <path d="M5 20h18v15H5z" fill={top?.color ?? "#ce473b"} />
        {top?.variant === "jacket" && (
          <path d="M13 21h3v14h-3zM5 27h5v3H5zM20 27h3v3h-3z" fill="#f8db92" />
        )}
        <path
          d="M2 23h4v13H2zM23 23h4v13h-4zM11 16h6v6h-6zM6 3h16v15H6z"
          fill={skin}
        />
        <path
          d="M5 2h18v6H5zM5 7h4v4H5zM20 7h3v4h-3z"
          fill={hair?.color ?? "#302825"}
        />
        {hair?.variant === "curls" && (
          <path
            d="M3 2h4v8H3zM7 0h6v3H7zM16 0h6v3h-6zM23 3h3v8h-3z"
            fill={hair.color}
          />
        )}
        {hair?.variant === "locs" && (
          <path d="M3 6h3v15H3zM23 6h3v15h-3z" fill={hair.color} />
        )}
        <path d="M10 11h2v2h-2zM17 11h2v2h-2z" fill="#302825" />
        {hat && (
          <path
            d={
              hat.variant === "wide-hat"
                ? "M7 0h14v4h8v4H0V4h7z"
                : "M5 0h18v6H5zM20 5h8v3h-8z"
            }
            fill={hat.color}
          />
        )}
      </g>
    </g>
  );
}

export function FurnitureShape({
  item,
  scale = 1,
}: {
  item: HomeItem;
  scale?: number;
}) {
  const c = item.color,
    wide = 18 + item.width * 8;
  return (
    <g
      transform={`scale(${scale})`}
      stroke="#34434a"
      strokeWidth="1.5"
      strokeLinejoin="miter"
    >
      {item.variant === "rug" ? (
        <>
          <path d={`M0 -18l${wide} 16L0 16l-${wide} -18z`} fill={c} />
          <path
            d={`M0 -10l${wide - 8} 10L0 9l-${wide - 8} -10z`}
            fill="none"
            stroke="#f3d4a5"
          />
        </>
      ) : (
        <>
          <ellipse
            cy="3"
            rx={wide * 0.8}
            ry="8"
            fill="#1e3941"
            opacity=".13"
            stroke="none"
          />
          {(item.variant === "chair" ||
            item.variant === "table" ||
            item.variant === "sofa") && (
            <>
              <path
                d={`M-${wide} -12v17m${wide * 2} -17v17M0 -3v15`}
                fill="none"
                strokeWidth="4"
              />
              {item.variant !== "table" && (
                <path
                  d={`M-${wide} -15v-22l${wide} -9 ${wide} 13v21`}
                  fill={c}
                />
              )}
              <path d={`M0 -28l${wide} 14L0 1l-${wide} -14z`} fill={c} />
              {item.variant === "sofa" && (
                <path
                  d={`M-${wide} -15v-12m${wide * 2} 14v-14M0 -24v20`}
                  fill="none"
                  strokeWidth="5"
                />
              )}
            </>
          )}
          {item.variant === "plant" && (
            <>
              <path d="M-12 -12h24L8 5H-7z" fill="#b67855" />
              <path
                d="M0 -13v-35m0 20l-15 -14m15 8l14 -17m-14 6l-8 -17"
                fill="none"
                stroke={c}
                strokeWidth="8"
              />
            </>
          )}
          {item.variant === "lamp" && (
            <>
              <path d="M0 0v-48" strokeWidth="4" />
              <path d="M-9 3h18" strokeWidth="4" />
              <path d="M-12 -52h24l7 16h-38z" fill={c} />
            </>
          )}
          {item.variant === "fan" && (
            <>
              <path d="M0 0v-34m-10 38h20" strokeWidth="4" />
              <circle cy="-42" r="16" fill={c} />
              <path
                d="M0 -57v30m-14 -15h28m-23 -10l20 20m0 -20l-20 20"
                fill="none"
              />
            </>
          )}
          {item.variant === "pan" && (
            <>
              <path d="M-16 -21L-20 7m36 -28L20 7" strokeWidth="3" />
              <ellipse cy="-24" rx="25" ry="13" fill={c} />
              <path d="M-12 -30l24 10m-23 0l23 -10M0 -36v23" fill="none" />
            </>
          )}
          {item.variant === "arcade" && (
            <>
              <path d="M-20 -54h33l9 13v43l-42 -6z" fill={c} />
              <path d="M-15 -46h24v20h-24z" fill="#223d46" />
              <path d="M-15 -21h27l5 10h-32z" fill="#edbf6f" />
              <path d="M-9 -37h6v5h-6zM1 -33h6v5H1z" fill="#70c4b0" />
            </>
          )}
        </>
      )}
    </g>
  );
}

export function ItemPicture({ item }: { item: HomeItem }) {
  return (
    <svg
      viewBox="-50 -70 100 100"
      aria-hidden="true"
      className="home-item-picture"
    >
      {item.kind === "furniture" ? (
        <FurnitureShape item={item} />
      ) : (
        <g shapeRendering="crispEdges" fill={item.color}>
          {item.slot === "hair" && (
            <path d="M-18 -44h36v13h-36zM-21 -32h8v18h-8zM13 -32h8v18h-8z" />
          )}
          {item.slot === "hat" && (
            <path
              d={
                item.variant === "wide-hat"
                  ? "M-16 -43h32v18h14v7h-60v-7h14z"
                  : "M-22 -43h38v24h-38zM12 -24h20v7H12z"
              }
            />
          )}
          {item.slot === "top" && (
            <>
              <path d="M-12 -40h24l15 13-9 9-6-5V6h-24v-29l-6 5-9-9z" />
              {item.variant === "jacket" && (
                <path d="M-2 -40h4V6h-4z" fill="#f4d491" />
              )}
            </>
          )}
          {item.slot === "bottom" && <path d="M-19 -43h38V7H3v-29h-6V7h-16z" />}
          {item.slot === "shoes" && (
            <path d="M-24 -20h19V0h-30v-7h11zM7 -20h19v13h9v7H7z" />
          )}
        </g>
      )}
    </svg>
  );
}

export function RoomScene({
  design,
  catalog,
  avatar,
  selected,
  placing = false,
  onTile,
  onSelect,
  onStep,
}: {
  design: HomeDesign;
  catalog: HomeItem[];
  avatar: { x: number; y: number };
  selected: string | null;
  placing?: boolean;
  onTile: (x: number, y: number) => void;
  onSelect: (id: string) => void;
  onStep: (dx: number, dy: number) => void;
}) {
  const placed = design.layout.flatMap((p) => {
    const item = catalog.find((i) => i.id === p.item_id);
    return item ? [{ p, item }] : [];
  });
  const paint = placed.map(({ p, item }) => ({
    key: p.instance_id,
    depth: p.x + p.y + (item.width + item.height) / 2,
    layer: item.layer,
    p,
    item,
  }));
  const objects: (
    | {
        key: string;
        depth: number;
        layer: number;
        p: HomePlacement;
        item: HomeItem;
      }
    | { key: string; depth: number; layer: number; p: null; item: null }
  )[] = [
    ...paint,
    {
      key: "avatar",
      depth: avatar.x + avatar.y + 1,
      layer: 1,
      p: null,
      item: null,
    },
  ];
  objects.sort(
    (a, b) =>
      a.layer - b.layer || a.depth - b.depth || a.key.localeCompare(b.key),
  );
  const floors = ["#ebcf9b", "#cad4c7", "#c7d2dc"],
    walls = ["#fbedd2", "#d5e8df", "#dee0ed"];
  return (
    <svg
      className="home-room-scene"
      viewBox="0 0 620 455"
      role="group"
      aria-label="Your isometric room. Use arrow keys to walk, or furniture controls below to decorate."
      tabIndex={0}
      onKeyDown={(e) => {
        const d: Record<string, number[]> = {
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
        };
        if (d[e.key]) {
          e.preventDefault();
          onStep(d[e.key]![0]!, d[e.key]![1]!);
        }
      }}
    >
      <path d="M310 148L54 276v10l256 130 256-130v-10z" fill="#98725a" />
      <path
        d="M310 150L54 278V178L310 50zM310 150l256 128V178L310 50z"
        fill={walls[design.wall]}
        stroke="#b9aa91"
        strokeWidth="2"
      />
      <path
        d="M310 50v100M55 179l256-129 254 129"
        fill="none"
        stroke="#9d8d78"
        strokeWidth="3"
      />
      <path
        d="M128 170l77-38v51l-77 38z"
        fill="#83b8bd"
        stroke="#fef7e6"
        strokeWidth="7"
      />
      <path d="M166 152v52M128 197l77-38" stroke="#fef7e6" strokeWidth="4" />
      {Array.from({ length: 64 }, (_, i) => {
        const x = i % 8,
          y = Math.floor(i / 8);
        return (
          <polygon
            key={i}
            points={diamond(x, y)}
            fill={floors[design.floor]}
            stroke="#ad987a"
            strokeOpacity=".3"
            strokeWidth="1"
            onClick={() => onTile(x, y)}
            className="home-floor-tile"
          >
            <title>
              Column {x + 1}, row {y + 1}
            </title>
          </polygon>
        );
      })}
      {objects.map((o) => {
        if (!o.p) {
          const [x, y] = iso(avatar.x + 0.5, avatar.y + 0.5);
          return (
            <g key="avatar" pointerEvents="none">
              <PixelAvatar
                x={x}
                y={y}
                design={design}
                catalog={catalog}
                scale={1.25}
              />
            </g>
          );
        }
        const { w, h } = homeFootprint(o.item!, o.p),
          [x, y] = iso(o.p.x + w / 2, o.p.y + h / 2);
        return (
          <g
            key={o.key}
            pointerEvents={placing ? "none" : undefined}
            onClick={() => onSelect(o.key)}
            className="home-furniture"
          >
            {selected === o.key && (
              <polygon
                points={diamond(o.p.x, o.p.y, w, h)}
                fill="#fff2b4"
                fillOpacity=".8"
                stroke="#304f55"
                strokeWidth="3"
                strokeDasharray="5 3"
              />
            )}
            <g
              transform={`translate(${x} ${y})${o.p.rotation === 1 ? " scale(-1 1)" : ""}`}
            >
              <FurnitureShape item={o.item!} />
            </g>
            <title>{o.item!.label} · select to move</title>
          </g>
        );
      })}
    </svg>
  );
}
