/* Restoran Suriani — menu data
   Transcribed from the restaurant's scanned menu boards.
   To update: edit the price/name/description fields below — the site re-renders automatically.
   Items with price: null show a "please ask staff" note instead of a price (see PRICE_NOTES). */

const PRICE_NOTES = {
  illegible: { ms: "Harga tidak jelas pada menu — sila semak dengan kakitangan", en: "Price unclear on the original menu — please confirm with staff" },
  unconfirmed: { ms: "Harga belum disahkan sepenuhnya — sila semak dengan kakitangan", en: "Price not fully confirmed — please double-check with staff" },
  torn: { ms: "Label harga koyak pada menu asal — sila semak dengan kakitangan", en: "Price sticker was torn on the original menu — please confirm with staff" },
  pictureOnly: { ms: "Turut terdapat di papan menu bergambar — sila tanya kakitangan untuk harga", en: "Also shown on our photo menu board — ask staff for current pricing" }
};

const MENU_CATEGORIES = [
  { id: "rice-sets", ms: "Set Nasi Putih", en: "Rice Sets", icon: "🍛" },
  { id: "indo", ms: "Menu Indonesia", en: "Indonesian Favourites", icon: "🍲" },
  { id: "noodles", ms: "Mee & Bihun", en: "Noodles", icon: "🍜" },
  { id: "fried-rice", ms: "Nasi Goreng", en: "Fried Rice", icon: "🍳" },
  { id: "sides", ms: "Set Tambahan", en: "Side Add-ons", icon: "🥗" },
  { id: "breakfast", ms: "Sarapan", en: "Breakfast", icon: "☕" },
  { id: "nasi-lemak", ms: "Nasi Lemak", en: "Nasi Lemak", icon: "🌶️" },
  { id: "hainan", ms: "Nasi Ayam Hainan", en: "Hainanese Chicken Rice", icon: "🍗" },
  { id: "western", ms: "Makanan Barat", en: "Western Food", icon: "🍽️", note: { ms: "Tambahan: +RM1 dengan keju, +RM2 dengan nasi goreng", en: "Add-ons: +RM1 with cheese, +RM2 with fried rice" } },
  { id: "pasta", ms: "Pasta", en: "Pasta", icon: "🍝" },
  { id: "side-dish", ms: "Side Dish", en: "Side Dish", icon: "🍟" },
  { id: "more", ms: "Lebih Pilihan", en: "More Favourites", icon: "⭐" }
];

const MENU_ITEMS = [
  // Set Nasi Putih (SNP01-20)
  { code: "SNP01", category: "rice-sets", ms: "Ayam Masak Merah", en: "Chicken Masak Merah", descMs: "Ayam dimasak dalam kuah tomato-cili pedas.", descEn: "Chicken in a spicy tomato-chili gravy.", price: 10.0 },
  { code: "SNP02", category: "rice-sets", ms: "Daging Masak Merah", en: "Beef Masak Merah", descMs: "Daging dimasak dalam kuah tomato-cili pedas.", descEn: "Beef in a spicy tomato-chili gravy.", price: 12.0 },
  { code: "SNP03", category: "rice-sets", ms: "Seafood Masak Merah", en: "Seafood Masak Merah", descMs: "Hidangan laut dimasak dalam kuah tomato-cili pedas.", descEn: "Seafood in a spicy tomato-chili gravy.", price: 12.0 },
  { code: "SNP04", category: "rice-sets", ms: "Ayam Paprik", en: "Chicken Paprik", descMs: "Ayam digoreng tumis dengan sos paprik pedas ala Thai.", descEn: "Chicken stir-fried in Thai-style spicy basil/chili sauce.", price: 10.0 },
  { code: "SNP05", category: "rice-sets", ms: "Daging Paprik", en: "Beef Paprik", descMs: "Daging dalam sos paprik pedas ala Thai.", descEn: "Beef in Thai-style paprik sauce.", price: 12.0 },
  { code: "SNP06", category: "rice-sets", ms: "Seafood Paprik", en: "Seafood Paprik", descMs: "Hidangan laut dalam sos paprik pedas ala Thai.", descEn: "Seafood in Thai-style paprik sauce.", price: 12.0 },
  { code: "SNP07", category: "rice-sets", ms: "Paprik Campur", en: "Mixed Paprik", descMs: "Campuran ayam, daging & seafood dalam sos paprik.", descEn: "Mixed chicken, beef and seafood in paprik sauce.", price: 8.0, priceNote: PRICE_NOTES.unconfirmed },
  { code: "SNP08", category: "rice-sets", ms: "Ayam Goreng Kunyit", en: "Turmeric Fried Chicken", descMs: "Ayam digoreng dengan perapan kunyit.", descEn: "Chicken fried with turmeric marinade.", price: 10.0 },
  { code: "SNP09", category: "rice-sets", ms: "Daging Goreng Kunyit", en: "Turmeric Fried Beef", descMs: "Daging digoreng dengan perapan kunyit.", descEn: "Beef fried with turmeric marinade.", price: 11.0 },
  { code: "SNP10", category: "rice-sets", ms: "Tomyam Ayam", en: "Chicken Tomyam", descMs: "Sup tomyam ayam dihidang bersama nasi.", descEn: "Chicken tom yam soup served with rice.", price: 12.0 },
  { code: "SNP11", category: "rice-sets", ms: "Tomyam Daging", en: "Beef Tomyam", descMs: "Sup tomyam daging dihidang bersama nasi.", descEn: "Beef tom yam soup served with rice.", price: 13.0 },
  { code: "SNP12", category: "rice-sets", ms: "Tomyam Campur", en: "Mixed Tomyam", descMs: "Sup tomyam campuran dihidang bersama nasi.", descEn: "Mixed tom yam soup served with rice.", price: 14.0 },
  { code: "SNP13", category: "rice-sets", ms: "Tomyam Seafood", en: "Seafood Tomyam", descMs: "Sup tomyam seafood dihidang bersama nasi.", descEn: "Seafood tom yam soup served with rice.", price: 13.0 },
  { code: "SNP14", category: "rice-sets", ms: "Sup Tulang", en: "Bone Soup", descMs: "Sup tulang daging berempah.", descEn: "Spiced beef bone/rib soup.", price: 12.0 },
  { code: "SNP15", category: "rice-sets", ms: "Sup Ayam", en: "Chicken Soup", descMs: "Sup ayam panas.", descEn: "Warm chicken soup.", price: 10.0 },
  { code: "SNP16", category: "rice-sets", ms: "Sup Seafood", en: "Seafood Soup", descMs: "Sup seafood panas.", descEn: "Warm seafood soup.", price: 12.0 },
  { code: "SNP17", category: "rice-sets", ms: "Sup Daging", en: "Beef Soup", descMs: "Sup daging panas.", descEn: "Warm beef soup.", price: 12.0 },
  { code: "SNP18", category: "rice-sets", ms: "Sup Sayur", en: "Vegetable Soup", descMs: "Sup sayur ringan.", descEn: "Light vegetable soup.", price: 9.0 },
  { code: "SNP19", category: "rice-sets", ms: "Telur Mata", en: "Fried Egg", descMs: "Telur goreng mata (sunny side up).", descEn: "Fried egg, sunny side up.", price: 4.0 },
  { code: "SNP20", category: "rice-sets", ms: "Telur Dadar", en: "Rolled Omelette", descMs: "Telur dadar digulung.", descEn: "Rolled omelette.", price: 5.0 },

  // Menu Indonesia (ID01-06)
  { code: "ID01", category: "indo", ms: "Set Nasi Ayam", en: "Chicken Rice Set (Indonesian style)", descMs: "Set nasi bersama ayam berperisa ala Indonesia.", descEn: "Rice set with seasoned/fried chicken, Indonesian-style.", price: null, priceNote: PRICE_NOTES.illegible },
  { code: "ID02", category: "indo", ms: "Set Nasi Lele", en: "Catfish Rice Set", descMs: "Set nasi bersama ikan lele goreng.", descEn: "Rice set with fried catfish (lele).", price: null, priceNote: PRICE_NOTES.illegible },
  { code: "ID03", category: "indo", ms: "Set Nasi Daging", en: "Beef Rice Set", descMs: "Set nasi bersama daging.", descEn: "Rice set with beef.", price: null, priceNote: PRICE_NOTES.illegible },
  { code: "ID04", category: "indo", ms: "Tauhu Penyet", en: "Tauhu Penyet", descMs: "Tauhu goreng dihempap, dihidang bersama sambal.", descEn: "Smashed fried tofu served with sambal.", price: 8.0 },
  { code: "ID05", category: "indo", ms: "Bakso", en: "Bakso", descMs: "Sup bebola daging ala Indonesia.", descEn: "Indonesian meatball soup.", price: 8.0 },
  { code: "ID06", category: "indo", ms: "Soto", en: "Soto", descMs: "Sup ayam/daging berempah ala Indonesia.", descEn: "Indonesian spiced chicken/beef broth soup.", price: null, priceNote: PRICE_NOTES.illegible },

  // Mee & Bihun (MD01-14, MD16)
  { code: "MD01", category: "noodles", ms: "Biasa", en: "Regular", descMs: "Mee/kuey teow/bihun goreng biasa.", descEn: "Regular fried noodles — choice of mee, kuey teow or bihun.", price: 8.0 },
  { code: "MD02", category: "noodles", ms: "Sup", en: "Soup", descMs: "Mee sup.", descEn: "Noodle soup.", price: 8.0 },
  { code: "MD03", category: "noodles", ms: "Hailam", en: "Hailam", descMs: "Mee hailam dalam kuah pekat.", descEn: "Hailam-style noodles in a light braised gravy.", price: 8.0 },
  { code: "MD04", category: "noodles", ms: "Bandung", en: "Bandung", descMs: "Mee dalam kuah merah pedas ala Bandung.", descEn: "Noodles in a spicy red \"Bandung\"-style gravy.", price: 8.0 },
  { code: "MD05", category: "noodles", ms: "Kungfu", en: "Kungfu", descMs: "Mee goreng gaya kungfu bersama telur.", descEn: "Wok-tossed \"kungfu\" style noodles with egg.", price: 9.0 },
  { code: "MD06", category: "noodles", ms: "Seafood Kungfu", en: "Seafood Kungfu", descMs: "Mee kungfu bersama seafood.", descEn: "Kungfu-style noodles with seafood.", price: 12.0 },
  { code: "MD07", category: "noodles", ms: "Goreng Tomyam Thai", en: "Thai Tomyam Fried Noodles", descMs: "Mee goreng bercitarasa tomyam Thai.", descEn: "Thai tom yam fried noodles.", price: 9.0 },
  { code: "MD08", category: "noodles", ms: "Goreng Tomyam Thai Seafood", en: "Thai Tomyam Fried Noodles with Seafood", descMs: "Mee goreng tomyam Thai bersama seafood.", descEn: "Thai tom yam fried noodles with seafood.", price: 12.0 },
  { code: "MD09", category: "noodles", ms: "Singapore", en: "Singapore-style", descMs: "Bihun goreng kari gaya Singapura.", descEn: "Singapore-style curry fried rice vermicelli.", price: 8.0 },
  { code: "MD10", category: "noodles", ms: "Ladna Ayam", en: "Chicken Ladna", descMs: "Mee disiram kuah pekat ayam.", descEn: "Noodles topped with thick chicken gravy.", price: 9.0 },
  { code: "MD11", category: "noodles", ms: "Ladna Seafood", en: "Seafood Ladna", descMs: "Mee disiram kuah pekat seafood.", descEn: "Noodles topped with thick seafood gravy.", price: 12.0 },
  { code: "MD12", category: "noodles", ms: "Megi Goreng", en: "Fried Maggi", descMs: "Mee segera digoreng.", descEn: "Fried instant (Maggi-style) noodles.", price: 7.0 },
  { code: "MD13", category: "noodles", ms: "Megi Goreng Double", en: "Fried Maggi (Double)", descMs: "Mee segera goreng, dua bungkus.", descEn: "Double portion fried instant noodles.", price: 12.0 },
  { code: "MD14", category: "noodles", ms: "Megi Goreng Seafood", en: "Fried Maggi with Seafood", descMs: "Mee segera goreng bersama seafood.", descEn: "Fried instant noodles with seafood.", price: 12.0 },
  { code: "MD16", category: "noodles", ms: "Megi Sup", en: "Maggi Soup", descMs: "Mee segera sup.", descEn: "Instant noodle soup.", price: 8.0 },

  // Set Tambahan (ST01-07)
  { code: "ST01", category: "sides", ms: "Kangkung Belacan", en: "Kangkung Belacan", descMs: "Kangkung goreng tumis sambal belacan.", descEn: "Water spinach stir-fried in shrimp-paste sambal.", price: 7.0 },
  { code: "ST02", category: "sides", ms: "Kailan Ikan Masin", en: "Kailan with Salted Fish", descMs: "Kailan goreng bersama ikan masin.", descEn: "Chinese broccoli stir-fried with salted fish.", price: 8.0 },
  { code: "ST03", category: "sides", ms: "Sayur Campur", en: "Mixed Vegetables", descMs: "Sayur campur goreng tumis.", descEn: "Mixed stir-fried vegetables.", price: 8.0 },
  { code: "ST04", category: "sides", ms: "Telur Bungkus", en: "Wrapped Omelette", descMs: "Telur dadar dibalut bersama inti.", descEn: "Rolled omelette wrapped around a filling.", price: 8.0 },
  { code: "ST05", category: "sides", ms: "Telur Bistik", en: "Egg \"Bistik\"", descMs: "Telur goreng gaya bistik bersama bawang & kuah.", descEn: "\"Beef-steak style\" fried egg with onions and gravy.", price: 8.0 },
  { code: "ST06", category: "sides", ms: "Telur Dadar", en: "Plain Omelette", descMs: "Telur dadar biasa.", descEn: "Plain omelette.", price: 3.0 },
  { code: "ST07", category: "sides", ms: "Telur Mata", en: "Fried Egg", descMs: "Telur goreng mata (sunny side up).", descEn: "Fried egg, sunny side up.", price: 1.5 },

  // Nasi Goreng (MD17-40)
  { code: "MD17", category: "fried-rice", ms: "Biasa", en: "Plain", descMs: "Nasi goreng biasa.", descEn: "Plain fried rice.", price: 8.0 },
  { code: "MD18", category: "fried-rice", ms: "Seafood", en: "Seafood", descMs: "Nasi goreng seafood.", descEn: "Seafood fried rice.", price: 12.0 },
  { code: "MD19", category: "fried-rice", ms: "Kampung", en: "Kampung-style", descMs: "Nasi goreng kampung bersama ikan bilis.", descEn: "Kampung-style spicy fried rice with anchovies.", price: 8.0 },
  { code: "MD20", category: "fried-rice", ms: "Belacan", en: "Belacan", descMs: "Nasi goreng sambal belacan.", descEn: "Fried rice with shrimp-paste (belacan) sambal.", price: 8.0 },
  { code: "MD21", category: "fried-rice", ms: "Cili Padi", en: "Bird's-eye Chili", descMs: "Nasi goreng cili padi.", descEn: "Fried rice with bird's-eye chili.", price: 8.0 },
  { code: "MD22", category: "fried-rice", ms: "Ayam Goreng", en: "Fried Chicken", descMs: "Nasi goreng bersama ayam goreng.", descEn: "Fried rice with fried chicken.", price: 10.0 },
  { code: "MD23", category: "fried-rice", ms: "Ikan Masin", en: "Salted Fish", descMs: "Nasi goreng ikan masin.", descEn: "Fried rice with salted fish.", price: 9.0 },
  { code: "MD24", category: "fried-rice", ms: "Sardin", en: "Sardine", descMs: "Nasi goreng sardin.", descEn: "Fried rice with sardines.", price: 9.0 },
  { code: "MD25", category: "fried-rice", ms: "Pataya", en: "Pataya", descMs: "Nasi goreng dibalut telur dadar nipis.", descEn: "Fried rice wrapped in a thin omelette.", price: 9.0 },
  { code: "MD26", category: "fried-rice", ms: "Pataya Ayam Goreng", en: "Pataya with Fried Chicken", descMs: "Nasi goreng pataya bersama ayam goreng.", descEn: "Pataya fried rice with fried chicken.", price: 13.0 },
  { code: "MD27", category: "fried-rice", ms: "Paprik Ayam", en: "Chicken Paprik", descMs: "Nasi goreng bersama topping ayam paprik.", descEn: "Fried rice with chicken paprik topping.", price: 11.0 },
  { code: "MD28", category: "fried-rice", ms: "Paprik Campur", en: "Mixed Paprik", descMs: "Nasi goreng bersama topping paprik campur.", descEn: "Fried rice with mixed paprik topping.", price: 12.0 },
  { code: "MD29", category: "fried-rice", ms: "Paprik Seafood", en: "Seafood Paprik", descMs: "Nasi goreng bersama topping seafood paprik.", descEn: "Fried rice with seafood paprik topping.", price: 12.0 },
  { code: "MD30", category: "fried-rice", ms: "Paprik Daging", en: "Beef Paprik", descMs: "Nasi goreng bersama topping daging paprik.", descEn: "Fried rice with beef paprik topping.", price: 12.0 },
  { code: "MD31", category: "fried-rice", ms: "Ayam Masak Merah", en: "Chicken Masak Merah", descMs: "Nasi goreng bersama ayam masak merah.", descEn: "Fried rice with chicken in spicy tomato gravy.", price: 11.0 },
  { code: "MD32", category: "fried-rice", ms: "Daging Masak Merah", en: "Beef Masak Merah", descMs: "Nasi goreng bersama daging masak merah.", descEn: "Fried rice with beef in spicy tomato gravy.", price: 12.0 },
  { code: "MD33", category: "fried-rice", ms: "Seafood Masak Merah", en: "Seafood Masak Merah", descMs: "Nasi goreng bersama seafood masak merah.", descEn: "Fried rice with seafood in spicy tomato gravy.", price: 12.0 },
  { code: "MD34", category: "fried-rice", ms: "Ayam Goreng Kunyit", en: "Turmeric Fried Chicken", descMs: "Nasi goreng bersama ayam goreng kunyit.", descEn: "Fried rice with turmeric fried chicken.", price: 10.0 },
  { code: "MD35", category: "fried-rice", ms: "USA", en: "\"USA\" style", descMs: "Nasi goreng gaya \"USA\" bersama telur & sosej.", descEn: "\"American-style\" fried rice with egg/sausage topping.", price: 11.0 },
  { code: "MD36", category: "fried-rice", ms: "Daging", en: "Beef", descMs: "Nasi goreng daging.", descEn: "Beef fried rice.", price: 11.0, priceNote: PRICE_NOTES.unconfirmed },
  { code: "MD37", category: "fried-rice", ms: "Tomyam", en: "Tomyam", descMs: "Nasi goreng bercitarasa tomyam.", descEn: "Tom yam-flavoured fried rice.", price: 9.0 },
  { code: "MD38", category: "fried-rice", ms: "Cendawan", en: "Mushroom", descMs: "Nasi goreng cendawan.", descEn: "Mushroom fried rice.", price: 9.0 },
  { code: "MD39", category: "fried-rice", ms: "Kerabu", en: "Kerabu", descMs: "Nasi goreng bersama topping kerabu pedas.", descEn: "Fried rice with spicy kerabu salad topping.", price: 9.0 },
  { code: "MD40", category: "fried-rice", ms: "Cina", en: "Chinese-style", descMs: "Nasi goreng gaya Cina.", descEn: "Chinese-style fried rice.", price: null, priceNote: PRICE_NOTES.torn },

  // Sarapan (B01-05)
  { code: "B01", category: "breakfast", ms: "Telur Setengah Masak (2 biji)", en: "Double Half-Boiled Eggs", descMs: "Dua biji telur setengah masak tradisional.", descEn: "Two traditional soft-boiled eggs.", price: 4.0 },
  { code: "B02", category: "breakfast", ms: "Roti Bakar", en: "Toast Bread", descMs: "Roti bakar bersama kaya/mentega.", descEn: "Toasted bread with kaya/butter.", price: 3.0 },
  { code: "B03", category: "breakfast", ms: "Mee/Kuey Teow/Nasi/Bihun Goreng", en: "Fried Noodles or Rice", descMs: "Pilihan mee, kuey teow, nasi atau bihun goreng saiz sarapan.", descEn: "Choice of fried noodles or rice, breakfast portion.", price: 4.0 },
  { code: "B04", category: "breakfast", ms: "Lontong", en: "Lontong", descMs: "Nasi impit dalam kuah sayur santan bersama telur rebus.", descEn: "Compressed rice cake in vegetable coconut gravy with a boiled egg.", price: 7.0 },
  { code: "B05", category: "breakfast", ms: "Nasi Impit & Kuah", en: "Nasi Impit & Curry", descMs: "Nasi impit bersama kuah kari.", descEn: "Compressed rice cubes with curry gravy.", price: 6.0 },

  // Nasi Lemak (NL01-09)
  { code: "NL01", category: "nasi-lemak", ms: "Biasa", en: "Regular", descMs: "Nasi lemak biasa bersama sambal, ikan bilis, kacang & telur.", descEn: "Regular coconut rice with sambal, anchovies, peanuts and egg.", price: 4.0 },
  { code: "NL02", category: "nasi-lemak", ms: "Telur Mata", en: "with Fried Egg", descMs: "Nasi lemak bersama telur mata.", descEn: "Nasi lemak with a fried egg.", price: 5.5 },
  { code: "NL03", category: "nasi-lemak", ms: "Ayam Goreng", en: "with Fried Chicken", descMs: "Nasi lemak bersama ayam goreng.", descEn: "Nasi lemak with fried chicken.", price: 8.0 },
  { code: "NL04", category: "nasi-lemak", ms: "Ayam Goreng + Telur Mata", en: "with Fried Chicken & Fried Egg", descMs: "Nasi lemak bersama ayam goreng dan telur mata.", descEn: "Nasi lemak with fried chicken and a fried egg.", price: 9.5 },
  { code: "NL05", category: "nasi-lemak", ms: "Ayam Rendang", en: "with Chicken Rendang", descMs: "Nasi lemak bersama ayam rendang.", descEn: "Nasi lemak with chicken rendang.", price: 8.0 },
  { code: "NL06", category: "nasi-lemak", ms: "Daging Rendang", en: "with Beef Rendang", descMs: "Nasi lemak bersama daging rendang.", descEn: "Nasi lemak with beef rendang.", price: 8.0 },
  { code: "NL07", category: "nasi-lemak", ms: "Sambal Paru", en: "with Beef Lung Sambal", descMs: "Nasi lemak bersama paru sambal.", descEn: "Nasi lemak with beef lung in sambal.", price: 7.0 },
  { code: "NL08", category: "nasi-lemak", ms: "Sambal Sotong", en: "with Sotong Sambal", descMs: "Nasi lemak bersama sotong sambal.", descEn: "Nasi lemak with squid in sambal.", price: 7.0 },
  { code: "NL09", category: "nasi-lemak", ms: "Udang Petai", en: "with Prawn & Petai", descMs: "Nasi lemak bersama udang dan petai.", descEn: "Nasi lemak with prawns and stink beans (petai).", price: 8.0 },

  // Nasi Ayam Hainan (NA01-06)
  { code: "NA01", category: "hainan", ms: "Ayam Stim", en: "Steamed Chicken Rice", descMs: "Nasi ayam Hainan, ayam stim.", descEn: "Hainanese chicken rice with steamed chicken.", price: 8.0 },
  { code: "NA02", category: "hainan", ms: "Ayam Panggang", en: "Roasted Chicken Rice", descMs: "Nasi ayam Hainan, ayam panggang.", descEn: "Hainanese chicken rice with roasted chicken.", price: 8.0 },
  { code: "NA03", category: "hainan", ms: "Ayam BBQ", en: "BBQ Chicken Rice", descMs: "Nasi ayam Hainan, ayam gaya BBQ/char siu.", descEn: "Hainanese chicken rice, BBQ/char-siu style.", price: 9.0 },
  { code: "NA04", category: "hainan", ms: "Ayam Campur", en: "Mixed Chicken Rice", descMs: "Campuran ayam stim & panggang.", descEn: "Mixed steamed and roasted chicken rice.", price: 14.0 },
  { code: "NA05", category: "hainan", ms: "Taugeh", en: "Bean Sprouts", descMs: "Taugeh rebus sebagai lauk sampingan.", descEn: "Blanched bean sprouts side dish.", price: 5.0 },
  { code: "NA06", category: "hainan", ms: "Tambah Nasi", en: "Extra Rice", descMs: "Tambahan sebungkus nasi ayam.", descEn: "Extra portion of chicken rice.", price: 2.0 },

  // Makanan Barat (WF01-06)
  { code: "WF01", category: "western", ms: "Chicken Chop", en: "Chicken Chop", descMs: "Chicken chop digoreng bersama kuah.", descEn: "Pan-fried chicken chop with gravy.", price: 13.9 },
  { code: "WF02", category: "western", ms: "Chicken Grill", en: "Grilled Chicken", descMs: "Ayam panggang gaya barat.", descEn: "Grilled chicken.", price: 13.9 },
  { code: "WF03", category: "western", ms: "Beef Steak", en: "Beef Steak", descMs: "Stik daging lembu.", descEn: "Beef steak.", price: 15.9 },
  { code: "WF04", category: "western", ms: "Lamb Chop", en: "Lamb Chop", descMs: "Lamb chop panggang.", descEn: "Grilled lamb chop.", price: 16.9 },
  { code: "WF05", category: "western", ms: "Mixed Steak (Ayam & Daging)", en: "Mixed Steak (Chicken & Beef)", descMs: "Platter gabungan stik ayam dan daging.", descEn: "Combination chicken and beef steak platter.", price: 19.9 },
  { code: "WF06", category: "western", ms: "Fish N Chip", en: "Fish N Chips", descMs: "Ikan goreng bersama kentang goreng.", descEn: "Fish and chips.", price: 15.9 },

  // Pasta (P01-10)
  { code: "P01", category: "pasta", ms: "Aglio E Olio", en: "Aglio E Olio", descMs: "Pasta bawang putih & minyak zaitun.", descEn: "Garlic and olive oil pasta.", price: 10.9 },
  { code: "P02", category: "pasta", ms: "Aglio E Olio Daging", en: "Beef Aglio E Olio", descMs: "Aglio e olio bersama daging.", descEn: "Aglio e olio pasta with beef.", price: 12.9 },
  { code: "P03", category: "pasta", ms: "Aglio E Olio Seafood", en: "Seafood Aglio E Olio", descMs: "Aglio e olio bersama seafood.", descEn: "Aglio e olio pasta with seafood.", price: 14.9 },
  { code: "P04", category: "pasta", ms: "Aglio E Olio Chicken Grill", en: "Chicken Grill Aglio E Olio", descMs: "Aglio e olio bersama ayam panggang.", descEn: "Aglio e olio pasta with grilled chicken.", price: 18.9 },
  { code: "P05", category: "pasta", ms: "Bolognese Daging", en: "Beef Bolognese", descMs: "Pasta bolognese daging.", descEn: "Beef bolognese pasta.", price: 13.9 },
  { code: "P06", category: "pasta", ms: "Bolognese Ayam", en: "Chicken Bolognese", descMs: "Pasta bolognese ayam.", descEn: "Chicken bolognese pasta.", price: 12.9 },
  { code: "P07", category: "pasta", ms: "Bolognese Bebola Daging", en: "Beef Meatball Bolognese", descMs: "Pasta bolognese bersama bebola daging.", descEn: "Beef meatball bolognese pasta.", price: 12.9 },
  { code: "P08", category: "pasta", ms: "Carbonara", en: "Carbonara", descMs: "Pasta carbonara berkrim.", descEn: "Creamy carbonara pasta.", price: 11.9 },
  { code: "P09", category: "pasta", ms: "Carbonara Daging", en: "Beef Carbonara", descMs: "Carbonara bersama daging.", descEn: "Carbonara pasta with beef.", price: 13.9 },
  { code: "P10", category: "pasta", ms: "Carbonara Chicken Grill", en: "Chicken Grill Carbonara", descMs: "Carbonara bersama ayam panggang.", descEn: "Carbonara pasta with grilled chicken.", price: 18.9 },

  // Side Dish (SD01-07)
  { code: "SD01", category: "side-dish", ms: "Sup Cendawan", en: "Mushroom Soup", descMs: "Sup cendawan berkrim.", descEn: "Mushroom soup.", price: 7.0 },
  { code: "SD02", category: "side-dish", ms: "Roti Bawang Putih", en: "Garlic Bread", descMs: "Roti bawang putih panggang.", descEn: "Garlic bread.", price: 4.0 },
  { code: "SD03", category: "side-dish", ms: "Cheesy Wedges", en: "Cheesy Wedges", descMs: "Kentang wedges bersama keju.", descEn: "Potato wedges with cheese.", price: 6.9 },
  { code: "SD04", category: "side-dish", ms: "Chicken Nugget", en: "Chicken Nuggets", descMs: "Nugget ayam rangup.", descEn: "Chicken nuggets.", price: 8.9 },
  { code: "SD05", category: "side-dish", ms: "French Fries", en: "French Fries", descMs: "Kentang goreng.", descEn: "French fries.", price: 6.9 },
  { code: "SD06", category: "side-dish", ms: "Jumbo Sausage", en: "Jumbo Sausage", descMs: "Sosej jumbo panggang/goreng.", descEn: "Jumbo sausage.", price: 8.9 },
  { code: "SD07", category: "side-dish", ms: "Bebola Daging (5 biji)", en: "Meatballs (5 pieces)", descMs: "Lima biji bebola daging.", descEn: "Meatballs, 5 pieces.", price: 11.9 },

  // Lebih Pilihan — photo board, no confirmed prices (see PRICE_NOTES.pictureOnly)
  { code: "M01", category: "more", ms: "Tomyam Putih", en: "White Tomyam", descMs: "Sup tomyam lembut tanpa pes cili.", descEn: "Mild \"white\" tom yam soup without chili paste.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M02", category: "more", ms: "Sup Tulang", en: "Bone Soup", descMs: "Sup tulang daging.", descEn: "Beef bone/rib soup.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M03", category: "more", ms: "Sup Daging", en: "Beef Soup", descMs: "Sup daging.", descEn: "Beef soup.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M04", category: "more", ms: "Tomyam Seafood", en: "Seafood Tomyam", descMs: "Sup tomyam seafood.", descEn: "Seafood tom yam soup.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M05", category: "more", ms: "Sup Ayam", en: "Chicken Soup", descMs: "Sup ayam.", descEn: "Chicken soup.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M06", category: "more", ms: "Bihun Singapore", en: "Singapore Bihun", descMs: "Bihun goreng kari gaya Singapura.", descEn: "Singapore-style curry rice vermicelli.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M07", category: "more", ms: "Bihun Goreng", en: "Fried Bihun", descMs: "Bihun goreng biasa.", descEn: "Fried rice vermicelli.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M08", category: "more", ms: "Mee Hailam", en: "Hailam Noodles", descMs: "Mee hailam dalam kuah pekat.", descEn: "Hailam-style braised noodles.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M09", category: "more", ms: "Yee Mee Goreng", en: "Fried Yee Mee", descMs: "Mee telur tebal digoreng.", descEn: "Fried thick yellow egg noodles.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M10", category: "more", ms: "Mee Suah", en: "Mee Suah", descMs: "Bihun gandum digoreng.", descEn: "Fried wheat vermicelli.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M11", category: "more", ms: "Kuey Teow Ladna", en: "Kuey Teow Ladna", descMs: "Kuey teow rata disiram kuah pekat.", descEn: "Flat rice noodles topped with thick gravy.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M12", category: "more", ms: "Char Kuey Teow Basah", en: "Wet Char Kuey Teow", descMs: "Kuey teow goreng \"basah\" bersama kuah.", descEn: "\"Wet\" fried flat rice noodles with gravy.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M13", category: "more", ms: "Indo Mee Goreng", en: "Indo Fried Noodles", descMs: "Mee goreng manis ala Indonesia.", descEn: "Indonesian-style sweet soy fried noodles.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M14", category: "more", ms: "Mee Bandung", en: "Mee Bandung", descMs: "Mee dalam kuah merah pedas ala Bandung.", descEn: "Noodles in a spicy Bandung-style gravy.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M15", category: "more", ms: "Mee Goreng Pattaya", en: "Pattaya Fried Noodles", descMs: "Mee goreng dibalut telur dadar.", descEn: "Fried noodles wrapped in an omelette.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M16", category: "more", ms: "Maggi Seafood", en: "Maggi Seafood", descMs: "Mee segera goreng bersama seafood.", descEn: "Fried instant noodles with seafood.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M17", category: "more", ms: "Mee Goreng Seafood", en: "Seafood Fried Noodles", descMs: "Mee goreng bersama seafood.", descEn: "Fried noodles with seafood.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M18", category: "more", ms: "Nasi Goreng Sayur Campur", en: "Mixed Vegetable Fried Rice", descMs: "Nasi goreng sayur campur.", descEn: "Mixed vegetable fried rice.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M19", category: "more", ms: "Mee Tomyam", en: "Tomyam Noodles", descMs: "Mee bercitarasa tomyam.", descEn: "Tom yam-flavoured noodles.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M20", category: "more", ms: "Mee Goreng Mamak", en: "Mamak Fried Noodles", descMs: "Mee goreng pedas gaya mamak.", descEn: "Mamak-style spicy fried noodles.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M21", category: "more", ms: "Tahu Penyet", en: "Tahu Penyet", descMs: "Tauhu goreng dihempap bersama sambal.", descEn: "Smashed fried tofu with sambal.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M22", category: "more", ms: "Ayam Penyet", en: "Ayam Penyet", descMs: "Ayam goreng dihempap bersama sambal.", descEn: "Smashed fried chicken with sambal.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M23", category: "more", ms: "Bakso", en: "Bakso", descMs: "Sup bebola daging ala Indonesia.", descEn: "Indonesian meatball soup.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M24", category: "more", ms: "Ikan Penyet", en: "Ikan Penyet", descMs: "Ikan goreng dihempap bersama sambal.", descEn: "Smashed fried fish with sambal.", price: null, priceNote: PRICE_NOTES.pictureOnly },
  { code: "M25", category: "more", ms: "Daging Penyet", en: "Daging Penyet", descMs: "Daging goreng dihempap bersama sambal.", descEn: "Smashed fried beef with sambal.", price: null, priceNote: PRICE_NOTES.pictureOnly }
];
