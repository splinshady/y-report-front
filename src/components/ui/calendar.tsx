import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, UI, useDayPicker, type ChevronProps, type DayPickerProps, type NavProps } from "react-day-picker";

function CalendarChevron({ orientation, className }: ChevronProps) {
  if (orientation === "left" || orientation === "up") {
    return <ChevronLeft className={className} aria-hidden="true" />;
  }

  return <ChevronRight className={className} aria-hidden="true" />;
}

function CalendarNav({ className, style, onPreviousClick, onNextClick, previousMonth, nextMonth }: NavProps) {
  const {
    components,
    classNames,
    labels: { labelPrevious, labelNext },
  } = useDayPicker();

  return (
    <div className={className} style={style}>
      <components.PreviousMonthButton
        type="button"
        className={classNames[UI.PreviousMonthButton]}
        tabIndex={previousMonth ? undefined : -1}
        aria-disabled={previousMonth ? undefined : true}
        aria-label={labelPrevious(previousMonth)}
        onClick={(event) => {
          if (previousMonth) {
            onPreviousClick?.(event);
          }
        }}
      >
        <components.Chevron
          className={classNames[UI.Chevron]}
          disabled={previousMonth ? undefined : true}
          orientation="left"
        />
      </components.PreviousMonthButton>
      <components.NextMonthButton
        type="button"
        className={classNames[UI.NextMonthButton]}
        tabIndex={nextMonth ? undefined : -1}
        aria-disabled={nextMonth ? undefined : true}
        aria-label={labelNext(nextMonth)}
        onClick={(event) => {
          if (nextMonth) {
            onNextClick?.(event);
          }
        }}
      >
        <components.Chevron
          className={classNames[UI.Chevron]}
          disabled={nextMonth ? undefined : true}
          orientation="right"
        />
      </components.NextMonthButton>
    </div>
  );
}

export function Calendar({ className, classNames, components, ...props }: DayPickerProps) {
  return (
    <DayPicker
      {...props}
      showOutsideDays={false}
      hideWeekdays
      weekStartsOn={1}
      className={["w-full font-sans text-ink", className].filter(Boolean).join(" ")}
      classNames={{
        root: "w-full",
        months: "flex w-full flex-col gap-2",
        month: "w-full",
        month_grid: "w-full border-collapse",
        day: "p-0 text-center align-middle",
        nav: "flex w-full items-center justify-between",
        button_previous:
          "inline-flex min-h-touch min-w-touch items-center justify-center border-0 bg-transparent p-0 text-ink",
        button_next:
          "inline-flex min-h-touch min-w-touch items-center justify-center border-0 bg-transparent p-0 text-ink",
        caption_label: "font-sans text-body text-ink",
        chevron: "size-5",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        Nav: CalendarNav,
        ...components,
      }}
    />
  );
}
