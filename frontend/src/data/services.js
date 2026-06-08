/**
 * Complete services data for the Veterinary Site Template.
 * Organized by animal type -> preventive + urgent care sections.
 * All images are custom-generated and stored in /images/animals/
 */

const img = (slug) => `/images/animals/${slug}.webp`;

// ──────────────────────────────────────────────
// DOGS
// ──────────────────────────────────────────────
const DOG_PREVENTIVE = [
  {
    slug: "dog-wellness-exams",
    title: "Wellness & Preventive Exams",
    summary: "Annual and semiannual exams, growth tracking, preventive planning, baseline labs when appropriate.",
    image: img("svc-dog-wellness"),
    detail: "A comprehensive nose-to-tail exam is the foundation of your dog's health. We check heart, lungs, joints, skin, eyes, ears, teeth, and weight. For puppies we track growth milestones; for adults and seniors we recommend baseline bloodwork so we can catch problems early. Every visit ends with a clear written plan.",
  },
  {
    slug: "dog-vaccinations",
    title: "Dog Vaccinations",
    summary: "Core vaccines plus lifestyle-based vaccines. Distemper, adenovirus, parvovirus, rabies, leptospirosis, and more based on risk.",
    image: img("svc-dog-vaccine"),
    detail: "We follow AAHA guidelines for canine vaccination. Core vaccines include distemper, adenovirus, parvovirus, rabies, and leptospirosis. Beyond those, we evaluate your dog's lifestyle: boarding, dog parks, hiking, travel. We build a schedule that covers real risk without over-vaccinating.",
  },
  {
    slug: "dog-parasite-prevention",
    title: "Parasite Prevention",
    summary: "Heartworm, fleas, ticks, intestinal parasites, fecal screening, year-round prevention planning.",
    image: img("svc-dog-parasite"),
    objectPosition: "center top",
    detail: "Year-round parasite prevention is essential in our region. We screen for heartworm annually, run fecal tests, and recommend a prevention plan tailored to your dog's environment and exposure. Fleas, ticks, and intestinal parasites are all part of the conversation.",
  },
  {
    slug: "dog-dental-care",
    title: "Dental Care",
    summary: "Oral exams, professional cleanings, periodontal disease prevention, home dental guidance.",
    image: img("svc-dog-dental"),
    detail: "Dental disease is one of the most common conditions in dogs, and it is often painful long before it is obvious. We screen at every wellness visit and offer full cleanings with dental X-rays under anesthesia. Extractions are performed when needed. We also coach you on home dental care that actually works.",
  },
  {
    slug: "dog-skin-allergy-ear",
    title: "Skin, Allergy & Ear Care",
    summary: "Hot spots, itching, recurrent ear infections, seasonal allergies, food sensitivities.",
    image: img("svc-dog-skin-allergy"),
    objectPosition: "center top",
    detail: "Allergies are one of the most common reasons dogs come to see us: itching, ear infections, hot spots, licking paws. We work through whether the cause is environmental, food-related, or seasonal, and build a plan that actually resolves the issue rather than just masking symptoms.",
  },
  {
    slug: "dog-nutrition-weight",
    title: "Nutrition & Weight Management",
    summary: "Puppy nutrition, adult maintenance, obesity prevention, prescription diets, joint-support nutrition.",
    image: img("svc-dog-nutrition"),
    objectPosition: "center top",
    detailObjectPosition: "center 25%",
    detail: "Good nutrition is the foundation of long-term health. We guide you through puppy feeding, adult maintenance, and senior diets. For dogs struggling with weight, we create realistic plans that work. Prescription diets are recommended when there is a clinical need, not as a default.",
  },
  {
    slug: "dog-surgery-spay-neuter",
    title: "Surgery & Spay/Neuter",
    summary: "Routine soft tissue surgery, anesthesia protocols, perioperative care.",
    image: img("svc-dog-surgery"),
    objectPosition: "center top",
    detail: "We perform routine soft tissue surgeries including spay, neuter, and mass removals. Every procedure follows careful anesthesia protocols with monitoring, IV fluids, and pain management. We discuss timing for spay/neuter based on breed and size rather than using a one-size-fits-all approach.",
  },
  {
    slug: "dog-senior-care",
    title: "Senior Dog Care",
    summary: "Mobility support, arthritis monitoring, cognition changes, senior bloodwork, quality-of-life support.",
    image: img("svc-dog-senior"),
    detail: "Senior dogs (typically 7+) benefit from twice-yearly exams and bloodwork to catch age-related conditions early. We monitor for arthritis, kidney disease, liver changes, thyroid issues, and cognitive decline. Digital radiography, joint supplements, weight management, and pain control are all part of our toolkit for keeping seniors comfortable.",
  },
];

const DOG_URGENT = [
  { slug: "dog-vomiting-diarrhea", title: "Vomiting & Diarrhea", summary: "GI distress is one of the most common reasons dogs come in. We assess hydration, run diagnostics when needed, and get your dog feeling better.", image: img("svc-dog-vomiting"), detail: "Vomiting and diarrhea can range from mild dietary indiscretion to serious conditions. We assess dehydration, run bloodwork and imaging when indicated, and provide supportive care. If symptoms persist beyond 24 hours or your dog is lethargic, call us right away." },
  { slug: "dog-ear-infections", title: "Ear Infections", summary: "Head shaking, scratching, odor, or discharge. We identify the cause and treat it properly so it does not keep coming back.", image: img("svc-dog-ear-infection"), detail: "Ear infections in dogs are often caused by yeast, bacteria, or allergies. We examine the ear canal, take samples when needed, and treat the root cause rather than just the symptoms. Recurrent ear infections often point to underlying allergies that we can address." },
  { slug: "dog-skin-hot-spots", title: "Skin Rashes, Hot Spots & Allergies", summary: "Sudden itching, redness, hair loss, or weeping sores. We diagnose the trigger and provide fast relief.", image: img("svc-dog-hot-spots"), detail: "Hot spots can appear overnight and spread quickly. We clean the area, identify the trigger (allergies, fleas, moisture), and provide medication for fast relief. For chronic skin issues, we investigate underlying causes like food sensitivities or environmental allergies." },
  { slug: "dog-limping-pain", title: "Limping & Pain", summary: "Lameness, reluctance to jump, or crying out. We assess the source of pain and build a treatment plan.", image: img("svc-dog-limping"), detail: "Limping can indicate anything from a pulled muscle to a ligament tear or fracture. We perform a thorough orthopedic and neurologic exam, use X-rays when needed, and create a pain management plan tailored to the cause." },
  { slug: "dog-coughing-respiratory", title: "Coughing & Respiratory Symptoms", summary: "Persistent cough, labored breathing, or nasal discharge. We evaluate heart, lungs, and airways.", image: img("svc-dog-coughing"), detail: "A persistent cough in dogs can indicate kennel cough, heart disease, collapsing trachea, or pneumonia. We listen to heart and lungs, take X-rays when indicated, and determine whether the cause is infectious, cardiac, or structural." },
  { slug: "dog-urinary-problems", title: "Urinary Problems", summary: "Straining, frequent urination, blood in urine, or accidents. We run urinalysis and get answers.", image: img("svc-dog-urinary"), detail: "Urinary symptoms like straining, frequent trips outside, blood in urine, or accidents in the house can indicate infection, stones, or other conditions. We run urinalysis and culture, and use imaging when needed to find the cause." },
  { slug: "dog-eye-problems", title: "Eye Problems", summary: "Redness, squinting, discharge, or swelling. Early treatment can prevent lasting damage.", image: img("svc-dog-eye"), detail: "Eye problems in dogs can progress quickly. Squinting, redness, cloudiness, or excessive tearing all warrant prompt evaluation. We assess for corneal ulcers, infections, glaucoma, and dry eye, and treat early to protect vision." },
  { slug: "dog-wounds-injuries", title: "Minor Wounds & Injuries", summary: "Cuts, scrapes, bite wounds, or trauma. We clean, assess, and treat to prevent infection.", image: img("svc-dog-wound"), detail: "We clean and assess wounds, determine if sutures or surgical repair are needed, manage pain, and prescribe antibiotics when appropriate. Bite wounds are especially important to address promptly due to infection risk." },
];

// ──────────────────────────────────────────────
// CATS
// ──────────────────────────────────────────────
const CAT_PREVENTIVE = [
  {
    slug: "cat-wellness-exams",
    title: "Wellness & Preventive Exams",
    summary: "Routine exams, weight trends, baseline screening, preventive planning, indoor/outdoor risk review.",
    image: img("svc-cat-wellness"),
    detailObjectPosition: "center 75%",
    detail: "Annual exams are critical for cats because they hide illness so well. We check weight trends, dental health, heart, thyroid, kidneys, and overall condition. For indoor cats we review environmental enrichment; for outdoor cats we assess risk factors. Baseline bloodwork helps us spot problems before they become emergencies.",
  },
  {
    slug: "cat-vaccinations",
    title: "Cat Vaccinations",
    summary: "Core feline vaccines plus lifestyle-based vaccines. FHV-1, FCV, FPV, rabies, and FeLV for at-risk cats.",
    image: img("svc-cat-vaccine"),
    objectPosition: "center top",
    detail: "We follow AAHA/AAFP feline vaccination guidelines. Core vaccines include FHV-1, FCV, FPV, and rabies. FeLV is recommended for all cats under 1 year and for any cat with outdoor access. We build a minimal, risk-appropriate schedule, not a one-size-fits-all list.",
  },
  {
    slug: "cat-parasite-prevention",
    title: "Parasite Prevention",
    summary: "Fleas, intestinal parasites, tick prevention, heartworm discussion based on geography and risk.",
    image: img("svc-cat-parasite"),
    detail: "Even indoor cats can get fleas and intestinal parasites. We recommend year-round prevention tailored to your cat's lifestyle and region. Heartworm discussion is included based on local risk factors. Fecal screening is part of every wellness visit.",
  },
  {
    slug: "cat-dental-care",
    title: "Dental Care",
    summary: "Oral exams, preventive dentistry, resorptive lesion awareness, senior oral monitoring.",
    image: img("svc-cat-dental"),
    detail: "Feline dental disease is incredibly common and painful, but cats rarely show obvious signs. Resorptive lesions are particularly common and can only be detected with dental X-rays. We screen at every wellness visit and offer full cleanings. Many cat owners are surprised how much better their cat feels after dental treatment.",
  },
  {
    slug: "cat-nutrition-weight",
    title: "Nutrition & Weight Management",
    summary: "Weight control, obesity prevention, urinary-health diets, kidney-support diets, life-stage feeding.",
    image: img("svc-cat-nutrition"),
    objectPosition: "center top",
    detail: "Obesity is a major health risk for cats, contributing to diabetes, joint disease, and urinary problems. We create realistic feeding plans tailored to your cat's age, activity level, and any health conditions. Prescription diets for urinary health or kidney support are recommended when clinically indicated.",
  },
  {
    slug: "cat-behavior-litter",
    title: "Behavior & Litter Box Health",
    summary: "Stress-related behaviors, litter box changes, scratching, environmental guidance.",
    image: img("svc-cat-behavior"),
    detailObjectPosition: "center 20%",
    detail: "Changes in litter box habits, hiding, aggression, or overgrooming often have a medical component. We always rule out physical causes first. For behavioral issues, we provide environmental enrichment guidance, multi-cat household strategies, and stress reduction techniques.",
  },
  {
    slug: "cat-surgery-spay-neuter",
    title: "Surgery & Spay/Neuter",
    summary: "Routine surgery, anesthesia, recovery support.",
    image: img("svc-cat-surgery"),
    objectPosition: "center top",
    detail: "We perform routine feline surgeries with careful feline-specific anesthesia protocols. Cats metabolize anesthesia differently than dogs, and our protocols reflect that. Pain management, temperature monitoring, and gentle recovery handling are standard for every procedure.",
  },
  {
    slug: "cat-senior-care",
    title: "Senior Cat Care",
    summary: "Kidney monitoring, thyroid screening, mobility support, chronic disease management, comfort care.",
    image: img("svc-cat-senior"),
    detail: "Cats over 10 benefit from twice-yearly exams, bloodwork, kidney function testing, thyroid screening, and blood pressure checks. Kidney disease, hyperthyroidism, and diabetes are common in older cats and highly manageable when caught early. We focus on comfort and quality of life at every stage.",
  },
];

const CAT_URGENT = [
  { slug: "cat-vomiting-appetite", title: "Vomiting & Appetite Loss", summary: "Cats who stop eating for even 24 to 48 hours are at risk. We assess quickly and intervene early.", image: img("svc-cat-vomiting"), detail: "A cat who stops eating for even one to two days is at risk for hepatic lipidosis (fatty liver disease). We assess hydration, run bloodwork, and provide supportive care. Vomiting combined with appetite loss always warrants a prompt visit." },
  { slug: "cat-respiratory", title: "Upper Respiratory Symptoms", summary: "Sneezing, nasal discharge, congestion, or eye involvement. Common in cats and treatable when caught early.", image: img("svc-cat-upper-resp"), detail: "Upper respiratory infections are common in cats, especially those from shelters or multi-cat homes. We evaluate for viral and bacterial causes, provide appropriate treatment, and monitor for complications like secondary pneumonia." },
  { slug: "cat-urinary", title: "Urinary Problems", summary: "Straining, crying in the litter box, blood in urine. In male cats, urethral obstruction is a life-threatening emergency.", image: img("svc-cat-urinary-urgent"), detail: "Urinary problems in cats range from infections to life-threatening obstructions. Male cats who strain to urinate and produce little or no urine need emergency care immediately. We run urinalysis, imaging, and provide catheterization when needed." },
  { slug: "cat-constipation", title: "Constipation", summary: "Straining without producing stool, vocalizing, or decreased appetite. Can become serious if left untreated.", image: img("svc-cat-constipation"), detail: "Chronic constipation in cats can lead to megacolon if left untreated. We assess hydration, diet, and motility, and provide treatment ranging from dietary changes to enemas and medication for severe cases." },
  { slug: "cat-skin-overgrooming", title: "Skin Issues & Overgrooming", summary: "Bald patches, excessive licking, scabs, or hair loss. Often stress or allergy related.", image: img("svc-cat-overgrooming"), detail: "Overgrooming, bald patches, and skin lesions in cats often have overlapping medical and behavioral causes. We test for allergies, parasites, and pain, then address the underlying trigger rather than just treating the symptoms." },
  { slug: "cat-eye-problems", title: "Eye Problems", summary: "Squinting, redness, discharge, or cloudiness. Prompt treatment protects vision.", image: img("svc-cat-eye"), detail: "Feline eye problems can progress rapidly. Squinting, redness, cloudiness, or discharge may indicate corneal ulcers, herpesvirus flares, or glaucoma. Early treatment protects vision and prevents complications." },
  { slug: "cat-dental-pain", title: "Mouth Pain & Dental Issues", summary: "Drooling, difficulty eating, pawing at the mouth. Often indicates advanced dental disease or resorptive lesions.", image: img("svc-cat-mouth-pain"), detail: "Cats with dental pain often drool, drop food, or paw at their face. Resorptive lesions and advanced periodontal disease are common causes. We perform dental X-rays under anesthesia to find and treat the source of pain." },
  { slug: "cat-behavior-hiding", title: "Behavior Change, Hiding & Lethargy", summary: "Cats who suddenly withdraw, stop eating, or become unusually quiet are often telling you something is wrong.", image: img("svc-cat-hiding"), detail: "Behavioral changes in cats, including hiding, lethargy, or loss of interest in food, are often the first signs of illness. We take these changes seriously and run a thorough evaluation to find the underlying cause." },
];

// ──────────────────────────────────────────────
// RABBITS
// ──────────────────────────────────────────────
const RABBIT_PREVENTIVE = [
  { slug: "rabbit-wellness-exams", title: "Rabbit Wellness Exams", summary: "Routine exams, weight checks, husbandry review, early illness detection.", image: img("svc-rabbit-wellness"), detail: "Rabbits are prey animals and hide illness exceptionally well. Annual wellness exams include a full physical, weight check, dental assessment, and a thorough review of diet, housing, and enrichment. Early detection makes all the difference with rabbits." },
  { slug: "rabbit-vaccination", title: "Rabbit Vaccination", summary: "RHDV2 vaccination where appropriate. Protection against a serious and often fatal disease.", image: img("svc-rabbit-vaccine"), detail: "Rabbit Hemorrhagic Disease Virus 2 (RHDV2) has spread across the US and is often fatal. Annual vaccination is the best protection. We follow current guidance from the House Rabbit Society and discuss risk based on your location and rabbit's exposure." },
  { slug: "rabbit-dental-care", title: "Dental Care", summary: "Rabbit teeth grow continuously. Hay-based diet, dental screening, and intervention when needed.", image: img("svc-rabbit-dental"), detail: "A rabbit's teeth grow continuously for life, and proper wear depends on a hay-based diet. We screen for malocclusion, overgrowth, and spurs at every visit. When dental issues arise, we intervene early to prevent pain, appetite loss, and secondary GI problems." },
  { slug: "rabbit-nutrition-gi", title: "Nutrition & Digestive Health", summary: "Hay-based diet guidance, GI health, appetite monitoring, stool monitoring, cecotrope issues.", image: img("svc-rabbit-nutrition"), detail: "Diet is the single most important factor in rabbit health. We emphasize unlimited hay, appropriate greens, limited pellets, and proper hydration. GI stasis is one of the most common and dangerous rabbit conditions, and good nutrition is the best prevention." },
  { slug: "rabbit-spay-neuter", title: "Spay/Neuter", summary: "Important for health, behavior, and litter prevention. An especially important service for rabbits.", image: img("svc-rabbit-spay"), objectPosition: "center top", detail: "Spaying female rabbits significantly reduces the risk of uterine cancer, which is extremely common in unspayed does over 3 to 4 years. Neutering males reduces territorial behavior. We use rabbit-safe anesthesia protocols and monitor recovery closely." },
  { slug: "rabbit-skin-parasite", title: "Skin & Parasite Care", summary: "Mites, fur issues, skin lesions, parasite concerns.", image: img("svc-rabbit-skin"), objectPosition: "center top", detail: "Rabbits are susceptible to fur mites, ear mites, and various skin conditions. We diagnose through skin scraping and examination, and treat with rabbit-safe products. Some over-the-counter flea products are toxic to rabbits, so guidance matters." },
  { slug: "rabbit-husbandry-habitat", title: "Husbandry & Habitat Guidance", summary: "Housing, enrichment, litter habits, exercise, stress reduction.", image: img("svc-rabbit-habitat"), detail: "Many rabbit health problems trace back to environment. We review enclosure size, flooring, litter choices, enrichment, exercise time, and social needs. Small adjustments often make a big difference in your rabbit's health and happiness." },
];

const RABBIT_URGENT = [
  { slug: "rabbit-appetite-loss", title: "Reduced Appetite or Not Eating", summary: "A rabbit who stops eating is an emergency. GI stasis can become life-threatening within hours.", image: img("svc-rabbit-gi-stasis"), detail: "A rabbit who stops eating needs immediate attention. GI stasis can progress from reduced appetite to complete shutdown within hours. We assess gut motility, hydration, and pain levels, and provide aggressive supportive care." },
  { slug: "rabbit-gi-stasis", title: "GI Stasis & Stool Changes", summary: "Decreased or absent droppings, bloating, or lethargy. This is the most common rabbit emergency.", image: img("svc-rabbit-gi-stasis"), detail: "GI stasis is the most common rabbit emergency. Signs include small or absent droppings, decreased appetite, hunched posture, and lethargy. Treatment includes fluid therapy, motility drugs, pain management, and nutritional support." },
  { slug: "rabbit-dental-pain", title: "Dental Pain & Drooling", summary: "Drooling, wet chin, dropping food, or reduced appetite. Often indicates tooth overgrowth or spurs.", image: img("svc-rabbit-dental"), detail: "Dental problems are extremely common in rabbits. Overgrown teeth, spurs, or abscesses cause pain, drooling, and appetite loss. We perform oral exams and skull X-rays to identify the problem and provide appropriate treatment." },
  { slug: "rabbit-respiratory", title: "Respiratory Illness", summary: "Sneezing, nasal discharge, labored breathing. Pasteurella and other infections require prompt treatment.", image: img("svc-rabbit-wellness"), detail: "Respiratory infections in rabbits are often caused by Pasteurella multocida. Sneezing, nasal discharge, and labored breathing require prompt treatment. We culture when appropriate and prescribe rabbit-safe antibiotics." },
  { slug: "rabbit-skin-fur", title: "Skin & Fur Problems", summary: "Hair loss, itching, scabs, or flaking. Mites and fungal infections are common causes.", image: img("svc-rabbit-skin"), detail: "Fur mites, ringworm, and bacterial skin infections are common in rabbits. We diagnose through skin scraping and examination, and treat with rabbit-safe products. Environmental cleaning is often part of the treatment plan." },
  { slug: "rabbit-urinary", title: "Urinary Problems", summary: "Sludgy urine, straining, or wet bottom. Calcium metabolism in rabbits makes urinary issues common.", image: img("svc-rabbit-wellness"), detail: "Rabbits metabolize calcium differently than other species, making them prone to urinary sludge and stones. We assess with urinalysis and imaging, adjust diet, and provide treatment as needed." },
  { slug: "rabbit-head-tilt", title: "Head Tilt & Neurologic Concerns", summary: "Sudden head tilt, circling, or loss of balance. Often caused by E. cuniculi or inner ear infection.", image: img("svc-rabbit-wellness"), detail: "Head tilt (torticollis) in rabbits is often caused by E. cuniculi (a protozoan parasite) or inner ear infection. Treatment depends on the cause and may include anti-parasitic medication, antibiotics, and supportive care." },
  { slug: "rabbit-injury-mobility", title: "Injury & Mobility Issues", summary: "Limping, reluctance to move, or signs of trauma. Rabbits have fragile spines that need careful assessment.", image: img("svc-rabbit-habitat"), detail: "Rabbits have fragile spines and can injure themselves with sudden movements or falls. Any limping, reluctance to move, or signs of pain need careful assessment. We evaluate for fractures, soft tissue injury, and provide appropriate pain management." },
];

// ──────────────────────────────────────────────
// GUINEA PIGS / SMALL HERBIVORES
// ──────────────────────────────────────────────
const GP_PREVENTIVE = [
  { slug: "gp-wellness-exams", title: "Wellness Exams", summary: "Routine exams, weight trends, preventive review, early detection of subtle illness.", image: img("svc-gp-wellness"), detail: "Guinea pigs are masters at hiding illness. Annual wellness exams include a thorough physical, dental check, weight trend review, and husbandry assessment. Early detection of common conditions like dental disease, respiratory infections, and vitamin C deficiency makes treatment much more effective." },
  { slug: "gp-nutrition-vitamin-c", title: "Nutrition & Vitamin Support", summary: "Guinea pigs require dietary vitamin C. High-fiber feeding, proper pellets, and fresh produce guidance.", image: img("svc-gp-nutrition"), detail: "Guinea pigs cannot produce their own vitamin C and require approximately 10 mg/kg daily from diet. Deficiency leads to scurvy: joint pain, lethargy, and poor healing. We review diet composition, hay quality, fresh produce, and supplement options. Proper nutrition prevents most guinea pig health problems." },
  { slug: "gp-dental-care", title: "Dental Care", summary: "Tooth overgrowth, chewing issues, weight loss, diet-linked dental disease.", image: img("svc-gp-dental"), detail: "Cheek-tooth elongation is the most common dental disease in guinea pigs. Like rabbits, their teeth grow continuously and depend on proper wear from hay and chewing. We screen for malocclusion and overgrowth at every visit. Weight loss and drooling are early warning signs." },
  { slug: "gp-skin-parasite", title: "Skin, Coat & Parasite Care", summary: "Mites, hair loss, itching, skin irritation.", image: img("svc-gp-skin-parasite"), objectPosition: "center top", detail: "Skin mites are extremely common in guinea pigs and cause intense itching, hair loss, and scabbing. Fungal infections (ringworm) are also prevalent. We diagnose through examination and skin scraping, and treat with species-safe products. Some over-the-counter treatments are not safe for guinea pigs." },
  { slug: "gp-foot-nail-grooming", title: "Foot, Nail & Grooming Care", summary: "Nail trims, foot sores, husbandry-related foot issues.", image: img("svc-gp-foot"), detail: "Pododermatitis (bumblefoot) is a common condition in guinea pigs, especially those on wire or rough flooring. Regular nail trims, proper bedding, and weight management help prevent it. We assess foot health at every visit and treat early to avoid complications." },
  { slug: "gp-diagnostics-appetite", title: "Diagnostics for Appetite, Weight & Respiratory Changes", summary: "These pets often mask illness. Subtle changes in eating, weight, or breathing deserve investigation.", image: img("svc-gp-diagnostics"), objectPosition: "center top", detail: "Guinea pigs hide illness until it is advanced. Unexplained weight loss, changes in appetite, or even subtle breathing changes can signal serious conditions. We use physical exam findings, bloodwork, and imaging when needed to get answers before problems become critical." },
  { slug: "gp-husbandry-habitat", title: "Husbandry & Habitat Guidance", summary: "Bedding, sanitation, enclosure setup, social housing, stress reduction.", image: img("svc-gp-habitat"), detail: "Many guinea pig health problems trace directly to husbandry. We review enclosure size, bedding type, sanitation schedule, temperature, social housing needs (guinea pigs are social and do best in pairs), and enrichment. Small changes at home often prevent veterinary visits later." },
];

const GP_URGENT = [
  { slug: "gp-not-eating", title: "Weight Loss & Not Eating", summary: "A guinea pig who stops eating needs prompt assessment. GI slowdown can escalate quickly.", image: img("svc-gp-wellness"), detail: "Guinea pigs who stop eating or lose weight rapidly need prompt evaluation. Unlike rabbits, guinea pigs do not develop hepatic lipidosis as quickly, but GI slowdown and dehydration can still become serious within a day or two." },
  { slug: "gp-dental-overgrowth", title: "Dental Overgrowth", summary: "Difficulty chewing, drooling, weight loss. The most common guinea pig dental problem.", image: img("svc-gp-dental"), detail: "Cheek-tooth elongation is the most common dental problem in guinea pigs. Signs include drooling, dropping food, weight loss, and reduced appetite. We perform oral exams and skull imaging to identify and treat overgrowth." },
  { slug: "gp-respiratory", title: "Respiratory Symptoms", summary: "Sneezing, wheezing, labored breathing, nasal discharge. Bacterial pneumonia is a common and serious concern.", image: img("svc-gp-respiratory"), detail: "Respiratory infections in guinea pigs are often bacterial (Bordetella, Streptococcus) and can progress to pneumonia quickly. Sneezing, labored breathing, and nasal discharge warrant a prompt visit. We culture when appropriate and treat with guinea-pig-safe antibiotics." },
  { slug: "gp-skin-mites", title: "Skin Mites & Hair Loss", summary: "Intense itching, scratching, bald patches, scabbing. Mites are extremely common and treatable.", image: img("svc-gp-skin-parasite"), detail: "Sarcoptic mange mites cause severe itching and hair loss in guinea pigs. Seizure-like scratching episodes are common with heavy infestations. We diagnose with skin scraping and treat with ivermectin or other safe anti-parasitic medication." },
  { slug: "gp-bumblefoot", title: "Foot Sores & Bumblefoot", summary: "Swollen or cracked footpads, limping. Often related to bedding, weight, or enclosure design.", image: img("svc-gp-foot"), detail: "Pododermatitis (bumblefoot) causes painful, swollen footpads. Contributing factors include wire flooring, rough bedding, obesity, and inadequate vitamin C. Treatment includes wound care, pain management, husbandry changes, and sometimes antibiotics." },
  { slug: "gp-stool-changes", title: "Diarrhea & Stool Changes", summary: "Soft stool, diarrhea, or reduced droppings. Can indicate diet issues, parasites, or infection.", image: img("svc-gp-nutrition"), detail: "Diarrhea in guinea pigs can indicate dietary imbalance, parasites, or bacterial infection. We assess diet, run fecal tests, and provide appropriate treatment. Dysbiosis from inappropriate antibiotic use is also a concern we screen for." },
  { slug: "gp-injury-weakness", title: "Injury or Weakness", summary: "Limping, inability to move, or signs of trauma. Guinea pigs are fragile and need gentle assessment.", image: img("svc-gp-wellness"), detail: "Guinea pigs can injure themselves in enclosures or during handling. Limping, reluctance to move, or sudden weakness all warrant evaluation. We assess for fractures, soft tissue injuries, and provide pain management and supportive care." },
  { slug: "gp-reproductive", title: "Reproductive Concerns", summary: "Pregnancy complications, cystic ovaries, or reproductive emergencies. Spaying is often recommended.", image: img("svc-gp-diagnostics"), detail: "Cystic ovaries are extremely common in unspayed female guinea pigs, causing hair loss and hormonal issues. Pregnancy in guinea pigs carries significant risks, especially first pregnancies after 6 months of age. We discuss spaying as a preventive measure." },
];

// ──────────────────────────────────────────────
// EXPORT
// ──────────────────────────────────────────────
export const SERVICES_BY_ANIMAL = {
  dogs: { label: "Dogs", intent: "dogs", preventive: DOG_PREVENTIVE, urgent: DOG_URGENT },
  cats: { label: "Cats", intent: "cats", preventive: CAT_PREVENTIVE, urgent: CAT_URGENT },
  rabbits: { label: "Rabbits", intent: "critters", preventive: RABBIT_PREVENTIVE, urgent: RABBIT_URGENT },
  guinea_pigs: { label: "Guinea Pigs & Small Herbivores", intent: "critters", preventive: GP_PREVENTIVE, urgent: GP_URGENT },
};

// Flat lookup for service detail pages
export const ALL_SERVICES = {};
for (const [key, animal] of Object.entries(SERVICES_BY_ANIMAL)) {
  for (const s of [...animal.preventive, ...animal.urgent]) {
    ALL_SERVICES[s.slug] = { ...s, animalLabel: animal.label, animalKey: key };
  }
}
