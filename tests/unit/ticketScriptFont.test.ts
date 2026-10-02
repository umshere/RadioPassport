import { describe, expect, it } from "vitest";
import { pickScriptFamily } from "~/services/ticket/renderTicket.server";

const HAN = "ja-JP|ko-KR|zh-CN|zh-TW|zh-HK";

describe("pickScriptFamily", () => {
  it("draws shared Han as Simplified Chinese, not Japanese", () => {
    expect(pickScriptFamily(HAN, "广东新闻广播", "Kwangtung China")).toBe("Noto Sans SC");
    expect(pickScriptFamily(HAN, "广东新闻广播")).toBe("Noto Sans SC");
  });
  it("follows kana, hangul and the country", () => {
    expect(pickScriptFamily(HAN, "ラジオ日本")).toBe("Noto Sans JP");
    expect(pickScriptFamily(HAN, "한국 라디오")).toBe("Noto Sans KR");
    expect(pickScriptFamily(HAN, "中廣新聞網", "Taipei Taiwan")).toBe("Noto Sans TC");
    expect(pickScriptFamily(HAN, "香港電台", "Hong Kong")).toBe("Noto Sans HK");
  });
  it("keeps single-script and unknown cases", () => {
    expect(pickScriptFamily("th-TH", "วิทยุ")).toBe("Noto Sans Thai");
    expect(pickScriptFamily("nope", "x")).toBe("Noto Sans");
  });
});
