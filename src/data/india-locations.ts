/**
 * Indian states and union territories with their main loading and unloading
 * towns. The city list feeds suggestions only: customers can type any place,
 * so it does not need to be exhaustive.
 */
export type Region = {
  name: string;
  cities: string[];
};

export const REGIONS: Region[] = [
  {
    name: "Andaman and Nicobar Islands",
    cities: ["Port Blair"],
  },
  {
    name: "Andhra Pradesh",
    cities: [
      "Anantapur", "Bhimavaram", "Chittoor", "Eluru", "Guntur", "Kadapa", "Kakinada", "Kurnool",
      "Machilipatnam", "Nellore", "Ongole", "Rajahmundry", "Srikakulam", "Tirupati", "Vijayawada",
      "Visakhapatnam", "Vizianagaram",
    ],
  },
  {
    name: "Arunachal Pradesh",
    cities: ["Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro"],
  },
  {
    name: "Assam",
    cities: ["Bongaigaon", "Dibrugarh", "Guwahati", "Jorhat", "Nagaon", "Silchar", "Tezpur", "Tinsukia"],
  },
  {
    name: "Bihar",
    cities: [
      "Arrah", "Begusarai", "Bhagalpur", "Bihar Sharif", "Darbhanga", "Gaya", "Hajipur", "Katihar",
      "Muzaffarpur", "Patna", "Purnia", "Samastipur",
    ],
  },
  {
    name: "Chandigarh",
    cities: ["Chandigarh"],
  },
  {
    name: "Chhattisgarh",
    cities: [
      "Ambikapur", "Bhilai", "Bilaspur", "Durg", "Jagdalpur", "Korba", "Raigarh", "Raipur",
      "Rajnandgaon",
    ],
  },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    cities: ["Daman", "Diu", "Silvassa"],
  },
  {
    name: "Delhi",
    cities: [
      "Delhi", "New Delhi", "Azadpur", "Bawana", "Dwarka", "Mundka", "Narela", "Okhla", "Rohini",
    ],
  },
  {
    name: "Goa",
    cities: ["Mapusa", "Margao", "Panaji", "Ponda", "Vasco da Gama"],
  },
  {
    name: "Gujarat",
    cities: [
      "Ahmedabad", "Anand", "Bharuch", "Bhavnagar", "Bhuj", "Gandhidham", "Gandhinagar", "Jamnagar",
      "Junagadh", "Mehsana", "Morbi", "Mundra", "Navsari", "Rajkot", "Surat", "Vadodara", "Valsad",
      "Vapi",
    ],
  },
  {
    name: "Haryana",
    cities: [
      "Ambala", "Bahadurgarh", "Faridabad", "Gurugram", "Hisar", "Karnal", "Kundli", "Kurukshetra",
      "Manesar", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sonipat", "Yamunanagar",
    ],
  },
  {
    name: "Himachal Pradesh",
    cities: ["Baddi", "Dharamshala", "Kullu", "Manali", "Mandi", "Parwanoo", "Shimla", "Solan", "Una"],
  },
  {
    name: "Jammu and Kashmir",
    cities: ["Anantnag", "Baramulla", "Jammu", "Kathua", "Sopore", "Srinagar", "Udhampur"],
  },
  {
    name: "Jharkhand",
    cities: ["Bokaro", "Deoghar", "Dhanbad", "Hazaribagh", "Jamshedpur", "Ranchi"],
  },
  {
    name: "Karnataka",
    cities: [
      "Ballari", "Belagavi", "Bengaluru", "Bidar", "Davanagere", "Hassan", "Hubballi", "Kalaburagi",
      "Kolar", "Mangaluru", "Mysuru", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura",
    ],
  },
  {
    name: "Kerala",
    cities: [
      "Alappuzha", "Kannur", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad",
      "Thiruvananthapuram", "Thrissur",
    ],
  },
  {
    name: "Ladakh",
    cities: ["Kargil", "Leh"],
  },
  {
    name: "Lakshadweep",
    cities: ["Kavaratti"],
  },
  {
    name: "Madhya Pradesh",
    cities: [
      "Bhopal", "Dewas", "Gwalior", "Indore", "Jabalpur", "Katni", "Pithampur", "Ratlam", "Rewa",
      "Sagar", "Satna", "Ujjain",
    ],
  },
  {
    name: "Maharashtra",
    cities: [
      "Ahilyanagar", "Akola", "Amravati", "Bhiwandi", "Chandrapur", "Chhatrapati Sambhajinagar",
      "Jalgaon", "Kolhapur", "Latur", "Mumbai", "Nagpur", "Nanded", "Nashik", "Navi Mumbai",
      "Panvel", "Pune", "Sangli", "Satara", "Solapur", "Thane", "Vasai-Virar",
    ],
  },
  {
    name: "Manipur",
    cities: ["Churachandpur", "Imphal", "Thoubal"],
  },
  {
    name: "Meghalaya",
    cities: ["Jowai", "Shillong", "Tura"],
  },
  {
    name: "Mizoram",
    cities: ["Aizawl", "Lunglei"],
  },
  {
    name: "Nagaland",
    cities: ["Dimapur", "Kohima", "Mokokchung"],
  },
  {
    name: "Odisha",
    cities: [
      "Balasore", "Berhampur", "Bhubaneswar", "Cuttack", "Jharsuguda", "Paradip", "Puri",
      "Rourkela", "Sambalpur",
    ],
  },
  {
    name: "Puducherry",
    cities: ["Karaikal", "Puducherry"],
  },
  {
    name: "Punjab",
    cities: [
      "Amritsar", "Bathinda", "Hoshiarpur", "Jalandhar", "Khanna", "Ludhiana", "Moga", "Mohali",
      "Pathankot", "Patiala", "Rajpura", "Sangrur",
    ],
  },
  {
    name: "Rajasthan",
    cities: [
      "Ajmer", "Alwar", "Bharatpur", "Bhilwara", "Bhiwadi", "Bikaner", "Jaipur", "Jodhpur", "Kota",
      "Neemrana", "Sikar", "Sri Ganganagar", "Udaipur",
    ],
  },
  {
    name: "Sikkim",
    cities: ["Gangtok", "Namchi", "Rangpo"],
  },
  {
    name: "Tamil Nadu",
    cities: [
      "Chennai", "Coimbatore", "Erode", "Hosur", "Kanchipuram", "Karur", "Madurai", "Nagercoil",
      "Namakkal", "Salem", "Thanjavur", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tiruppur",
      "Vellore",
    ],
  },
  {
    name: "Telangana",
    cities: [
      "Hyderabad", "Karimnagar", "Khammam", "Mahbubnagar", "Nizamabad", "Secunderabad", "Warangal",
    ],
  },
  {
    name: "Tripura",
    cities: ["Agartala", "Dharmanagar", "Udaipur"],
  },
  {
    name: "Uttar Pradesh",
    cities: [
      "Agra", "Aligarh", "Bareilly", "Firozabad", "Ghaziabad", "Gorakhpur", "Greater Noida",
      "Jhansi", "Kanpur", "Lucknow", "Mathura", "Meerut", "Moradabad", "Muzaffarnagar", "Noida",
      "Prayagraj", "Saharanpur", "Varanasi",
    ],
  },
  {
    name: "Uttarakhand",
    cities: ["Dehradun", "Haldwani", "Haridwar", "Kashipur", "Rishikesh", "Roorkee", "Rudrapur"],
  },
  {
    name: "West Bengal",
    cities: [
      "Asansol", "Bardhaman", "Durgapur", "Haldia", "Howrah", "Kharagpur", "Kolkata", "Malda",
      "Siliguri",
    ],
  },
];

export const REGION_NAMES: string[] = REGIONS.map((region) => region.name);

const CITIES_BY_REGION = new Map(REGIONS.map((region) => [region.name, region.cities]));

export function isRegion(name: string): boolean {
  return CITIES_BY_REGION.has(name);
}

export function citiesIn(regionName: string): string[] {
  return CITIES_BY_REGION.get(regionName) ?? [];
}
