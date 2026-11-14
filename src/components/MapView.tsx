import { Component, lazy, Suspense, type ReactNode, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type JobMapType from "./JobMap";

const JobMap = lazy(() => import("./JobMap"));

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function MapView(props: ComponentProps<typeof JobMapType> & { failText: string }) {
  const { failText, ...rest } = props;
  const fallback = <div className="flex h-full w-full items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">{failText}</div>;
  const loading = <div className="h-full w-full animate-pulse bg-muted" />;
  return (
    <Boundary fallback={fallback}>
      <ClientOnly fallback={loading}>
        <Suspense fallback={loading}><JobMap {...rest} /></Suspense>
      </ClientOnly>
    </Boundary>
  );
}
