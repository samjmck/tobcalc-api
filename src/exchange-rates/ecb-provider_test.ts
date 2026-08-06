import { assertEquals } from "@std/assert";
import { fillCalendarDays, parseCSV } from "./ecb-provider.ts";

Deno.test("parseCSV", () => {
  const csv = `KEY,TIME_PERIOD,OBS_VALUE
EXR.D.USD.EUR.SP00.A,2024-01-01,1.1050
EXR.D.USD.EUR.SP00.A,2024-01-02,1.1055`;

  const result = parseCSV(csv);

  assertEquals(result.get("2024-01-01"), 1.1050);
  assertEquals(result.get("2024-01-02"), 1.1055);
  assertEquals(result.size, 2);
});

Deno.test("fillCalendarDays with backfilling", () => {
  const start = Temporal.PlainDate.from("2024-01-01");
  const end = Temporal.PlainDate.from("2024-01-05");

  // Only rates for Monday and Tuesday (weekends on 06-07)
  const ratesByDate = new Map([
    ["2024-01-01", 1.1050],
    ["2024-01-02", 1.1055],
  ]);

  const result = fillCalendarDays(start, end, ratesByDate);

  assertEquals(result.length, 5);
  assertEquals(result[0], {
    date: Temporal.PlainDate.from("2024-01-01"),
    rate: 1.1050,
    backfilled: false,
  });
  assertEquals(result[1], {
    date: Temporal.PlainDate.from("2024-01-02"),
    rate: 1.1055,
    backfilled: false,
  });
  assertEquals(result[2], {
    date: Temporal.PlainDate.from("2024-01-03"),
    rate: 1.1055,
    backfilled: true,
  });
  assertEquals(result[3], {
    date: Temporal.PlainDate.from("2024-01-04"),
    rate: 1.1055,
    backfilled: true,
  });
  assertEquals(result[4], {
    date: Temporal.PlainDate.from("2024-01-05"),
    rate: 1.1055,
    backfilled: true,
  });
});
