"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // Base layout + focus/disabled states
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        // Size
        "data-[size=default]:h-[20px] data-[size=default]:w-[34px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]",
        // Track colors — default is the OFF state; data-checked overrides.
        // Base UI only sets data-checked (no data-unchecked attribute), so we
        // must use the default for the off state. --border resolves to a solid
        // mid-gray (#3d3a39 dark, #d4ccbc light) which reads as a distinct
        // capsule on either theme's bg.
        "bg-border",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full ring-0 transition-transform shadow-sm",
          // Size — read data-size from Root via named group
          "group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          // Translation — read data-checked from Root via named group.
          // Both sizes use calc(100%-2px); size difference is the thumb size itself.
          "translate-x-0 group-data-[checked]/switch:translate-x-[calc(100%-2px)]",
          // Thumb color — read from Root via named group, always inverts track:
          //   OFF  → track=border (mid-gray)  thumb=foreground (white/black)
          //   ON   → track=primary (cream/ink) thumb=primary-foreground (ink/paper)
          "bg-foreground group-data-[checked]/switch:bg-primary-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
