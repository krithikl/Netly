"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;
const DrawerHandle = DrawerPrimitive.Handle;

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    className={cn("fixed inset-0 z-[90] bg-black/25", className)}
    ref={ref}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      className={cn(
        "fixed inset-x-0 bottom-0 z-[100] mt-24 flex max-h-[82dvh] flex-col rounded-t-[26px] border border-[var(--outline)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(29,27,32,0.24)] outline-none",
        className
      )}
      ref={ref}
      {...props}
    >
      <DrawerHandle className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[rgba(29,27,32,0.18)]" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

const DrawerHeaderClose = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Close>
>(({ className, children, ...props }, ref) => (
  <DrawerPrimitive.Close
    className={cn("inline-grid h-10 w-10 place-items-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]", className)}
    ref={ref}
    {...props}
  >
    {children || <X className="h-5 w-5" />}
    <span className="sr-only">Close</span>
  </DrawerPrimitive.Close>
));
DrawerHeaderClose.displayName = "DrawerHeaderClose";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title className={cn("text-lg font-bold text-[var(--ink)]", className)} ref={ref} {...props} />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description className={cn("text-sm text-[var(--muted)]", className)} ref={ref} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger
};
