export function ArcadeLoader() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      {/* Arcade cabinet */}
      <div className="flex flex-col items-center">
        {/* Top of cabinet */}
        <div className="h-3 w-20 bg-makecode-purple" />

        {/* Cabinet body */}
        <div className="flex w-24 flex-col items-center gap-2 bg-makecode-purple px-2 pb-3 pt-2">
          {/* Marquee */}
          <div className="flex h-4 w-full items-center justify-center bg-makecode-yellow">
            <div className="flex gap-px">
              <div className="h-1.5 w-1.5 bg-makecode-red" />
              <div className="h-1.5 w-1.5 bg-makecode-cyan" />
              <div className="h-1.5 w-1.5 bg-makecode-green" />
              <div className="h-1.5 w-1.5 bg-makecode-red" />
              <div className="h-1.5 w-1.5 bg-makecode-cyan" />
            </div>
          </div>

          {/* Screen bezel */}
          <div className="flex w-full items-center justify-center bg-makecode-black p-1.5">
            {/* Screen */}
            <div className="flex h-14 w-full items-center justify-center bg-makecode-dark">
              {/* Spinner */}
              <div className="h-6 w-6 animate-spin border-4 border-makecode-cyan border-t-makecode-yellow" />
            </div>
          </div>

          {/* Control panel */}
          <div className="flex w-full items-center justify-between bg-makecode-mauve px-2 py-1.5">
            {/* Joystick */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="h-2.5 w-1.5 bg-makecode-black" />
              <div className="h-1 w-3 bg-makecode-black" />
            </div>
            {/* Buttons */}
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-makecode-red" />
              <div className="h-2.5 w-2.5 rounded-full bg-makecode-green" />
            </div>
          </div>
        </div>

        {/* Pedestal */}
        <div className="h-4 w-20 bg-makecode-brown" />

        {/* Base / feet */}
        <div className="flex w-24 justify-between">
          <div className="h-2 w-6 bg-makecode-black" />
          <div className="h-2 w-6 bg-makecode-black" />
        </div>
      </div>

      <p className="font-sans text-sm font-bold text-makecode-tan">Loading...</p>
    </div>
  );
}
