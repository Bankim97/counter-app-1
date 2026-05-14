const SUPABASE_URL = "https://pvhhcydrydjaxtpquvjj.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_tWUYMtiFo6OzDhgNFaCy3Q_rr0o08Rn";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const countEl =
  document.getElementById("count");

/* 숫자 표시 */

function updateCountDisplay(value) {

  countEl.textContent = value;

  // 50 이상 빨간색

  if (value >= 50) {

    countEl.classList.add("danger");

  } else {

    countEl.classList.remove("danger");

  }

}

/* 최초 카운트 불러오기 */

async function loadCount() {

  const { data, error } = await db
    .from("counters")
    .select("value")
    .eq("id", 1)
    .single();

  if (error) {

    alert("카운트 불러오기 실패");

    console.error(error);

    return;
  }

  updateCountDisplay(data.value);

}

/* 카운트 변경 */

async function changeCount(amount, action) {

  const { data, error } =
    await db.rpc("change_counter", {
      p_amount: amount,
      p_action: action
    });

  if (error) {

    alert("카운트 변경 실패");

    console.error(error);

    return;
  }

  updateCountDisplay(data);

}

/* 리셋 */

async function resetCount() {

  const ok =
    confirm("정말 리셋하시겠습니까?");

  if (!ok) return;

  const { data, error } =
    await db.rpc("reset_counter");

  if (error) {

    alert("리셋 실패");

    console.error(error);

    return;
  }

  updateCountDisplay(data);

}

/* 실시간 동기화 */

db.channel("counter-realtime")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "counters"
    },
    (payload) => {

      updateCountDisplay(
        payload.new.value
      );

    }
  )
  .subscribe();

/* 엑셀 다운로드 */

async function downloadCSV() {

  const { data, error } = await db
    .from("counter_logs")
    .select(
      "log_date, hour_label, action, amount"
    )
    .order("log_date", {
      ascending: true
    })
    .order("hour_label", {
      ascending: true
    });

  if (error) {

    alert("엑셀 다운로드 실패");

    console.error(error);

    return;
  }

  /* 시간대별 그룹화 */

  const grouped = {};

  data.forEach((row) => {

    const key =
      `${row.log_date}|${row.hour_label}`;

    if (!grouped[key]) {

      grouped[key] = {

        date: row.log_date,

        hour: row.hour_label,

        plus: 0,

        minus: 0,

        total: 0
      };

    }

    /* 증가 */

    if (row.amount > 0) {

      grouped[key].plus += row.amount;

    }

    /* 차감 */

    else if (row.amount < 0) {

      grouped[key].minus +=
        Math.abs(row.amount);

    }

    /* 합계 */

    grouped[key].total += row.amount;

  });

  /* CSV 헤더 */

  const header = [

    "날짜",

    "시간대",

    "인원",

    "차감",

    "합계"

  ];

  /* CSV 행 */

  const rows =
    Object.values(grouped).map((row) => [

      row.date,

      row.hour,

      row.plus,

      row.minus,

      row.total

    ]);

  /* CSV 생성 */

  const csv = [header, ...rows]

    .map((row) =>

      row
        .map((value) =>

          `"${String(value ?? "")
            .replaceAll('"', '""')}"`

        )
        .join(",")

    )

    .join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type:
        "text/csv;charset=utf-8;"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `카운터_시간대별_집계_${
      new Date()
        .toISOString()
        .slice(0, 10)
    }.csv`;

  a.click();

  URL.revokeObjectURL(url);

}

/* 시작 */

loadCount();