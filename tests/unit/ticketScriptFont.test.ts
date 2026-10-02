import { describe, expect, it } from "vitest";
import { arabicVisualOrder, pickScriptFamily } from "~/services/ticket/renderTicket.server";

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

describe("scripts satori files as unknown", () => {
  it.each([
    ["રેડિયો", "Noto Sans Gujarati"],
    ["ਰੇਡੀਓ ਪੰਜਾਬ", "Noto Sans Gurmukhi"],
    ["ශ්‍රී ලංකා", "Noto Sans Sinhala"],
    ["វិទ្យុខ្មែរ", "Noto Sans Khmer"],
    ["ວິທະຍຸລາວ", "Noto Sans Lao"],
    ["မြန်မာ့အသံ", "Noto Sans Myanmar"],
    ["რადიო", "Noto Sans Georgian"],
    ["Հայաստան", "Noto Sans Armenian"],
    ["ኢትዮጵያ", "Noto Sans Ethiopic"],
  ])("%s", (text, family) => {
    expect(pickScriptFamily("unknown", text)).toBe(family);
  });
  it("leaves Russian and Greek to Noto Sans", () => {
    expect(pickScriptFamily("unknown", "Радио Россия")).toBe("Noto Sans");
  });
});

describe("arabicVisualOrder", () => {
  it("reverses Arabic words and leaves other text alone", () => {
    expect(arabicVisualOrder("one two")).toBe("one two");
    expect(arabicVisualOrder("שלום עולם")).toBe("שלום עולם");
    expect(arabicVisualOrder("إذاعة القرآن الكريم")).toBe("الكريم القرآن إذاعة");
  });
  it("keeps a Latin run in its own order inside Arabic", () => {
    expect(arabicVisualOrder("راديو FM 101")).toBe("FM 101 راديو");
  });
});
