import {
  Children,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  itemAs?: ElementType;
  delay?: number;
};

export function AnimatedGroup({
  children,
  className,
  as: Container = "div",
  itemAs: Item = "div",
  delay = 0,
}: AnimatedGroupProps) {
  return (
    <Container className={className}>
      {Children.map(children, (child, index) => (
        <Item
          key={index}
          className="animate-rise"
          style={
            {
              animationDelay: `${delay + index * 0.06}s`,
            } as CSSProperties
          }
        >
          {child}
        </Item>
      ))}
    </Container>
  );
}
