import React, { useState, useRef, useEffect } from "react";
import "./CollegeList.css";
import { Card, CardContent, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { useCollegeList } from "./CollegeProvider";
import defaultCollegePic from '../assets/collegepictures/default.jpg';
import trashIcon from '../assets/trash.png';
import { getCollegeProgress, saveCollegeProgress } from '../api';

const collegeImageModules = import.meta.glob('../assets/collegepictures/*.jpeg', { eager: true });
const collegeImages = {};
Object.entries(collegeImageModules).forEach(([path, mod]) => {
  const id = path.match(/\/([^/]+)\.jpeg$/)[1];
  collegeImages[id] = mod.default;
});

// Import the same colleges array or move to a shared file
export const allColleges = [
{
    id: 'PN',
    name: 'Princeton University',
    x: 903,
    y: 188,
    ranking: 1,
    tuition: 62400,
    undergrad_enrollment: 5671,
    acceptance_rate: 0.045,
    image: "https://www.usnews.com/dims4/USNEWS/4d60b63/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F4a%2Fde%2Fe754e2714cae81f92edb1c7b273d%2F190827princeton-university23.jpg",
    location: 'Princeton, NJ',
    description: "Top-ranked private university renowned for its undergraduate focus, strong research output, and need-blind admission policy."
},
{
    id: 'HD',
    name: 'Harvard University',
    x: 945,
    y: 133,
    ranking: 3,
    tuition: 61676,
    undergrad_enrollment: 7110,
    acceptance_rate: 0.03,
    image: "https://www.usnews.com/dims4/USNEWS/00274ad/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F65%2F09a2103d862fb8eb15a9a6542c080b%2Fcollege-photo_8866.jpg",
    location: 'Cambridge, MA',
    description: "America’s oldest institution, excelling across all major fields—law, business, medicine, humanities—and boasts a historic campus."
},
{
    id: 'CA',
    name: 'Stanford University',
    x: 174,
    y: 250,
    ranking: 4,
    tuition: 65910,
    undergrad_enrollment: 8054,
    acceptance_rate: 0.04,
    image: "https://www.usnews.com/dims4/USNEWS/9f9855e/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F6d%2Fc497d367e3b5da44ac673b8f9dfbbf%2Fcollege-photo_10369.jpg",
    location: 'Stanford, CA',
    description: "Stanford stands out in entrepreneurship, technology, and engineering, with deep ties to Silicon Valley’s innovation landscape."
},
{
    id: 'YE',
    name: 'Yale University',
    x: 923,
    y: 156,
    ranking: 5,
    tuition: 67250,
    undergrad_enrollment: 6818,
    acceptance_rate: 0.05,
    location: 'New Haven, CT',
    description: "Prestigious Ivy League school celebrated for its liberal arts, drama, and law programs within a tight-knit residential college system."
},
{ id: 'BN', 
    name: 'Brown University', 
    x: 941, 
    y: 144, 
    ranking: 6,
    tuition: 71312,
    undergrad_enrollment: 7741,
    acceptance_rate: 0.05,
    location: 'Providence, RI',
    description: "Ivy League institution offering an open curriculum that empowers self‑directed study across humanities and sciences."
},
{
    id: 'CY',
    name: 'California Institute of Technology',
    x: 209,
    y: 332,
    ranking: 7,
    tuition: 65898,
    undergrad_enrollment: 1023,
    acceptance_rate: 0.03,
    location: 'Pasadena, CA',
    description: "Elite science and engineering institution with a powerful research environment and a very low student-to-faculty ratio."
},
{
    id: 'DK',
    name: 'Duke University',
    x: 868,
    y: 286,
    ranking: 8,
    tuition: 69140,
    undergrad_enrollment: 6488,
    acceptance_rate: 0.07,
    location: 'Durham, NC',
    description: "Selective private research university known for strong biomedical engineering, public policy, law, and robust campus life."
},
{
    id: 'JH',
    name: 'Johns Hopkins University',
    x: 882,
    y: 212,
    ranking: 9,
    tuition: 65230,
    undergrad_enrollment: 6090,
    acceptance_rate: 0.08,
    location: 'Baltimore, MD',
    description: "Distinguished for top-tier pre-med, public health, nursing, and biomedical engineering programs."
},
{
    id: 'NWN',
    name: 'Northwestern University',
    x: 693,
    y: 200,
    ranking: 10,
    tuition: 68322,
    undergrad_enrollment: 8846,
    acceptance_rate: 0.07,
    location: 'Evanston, IL',
    description: "Renowned for journalism, engineering, and the arts; strong interdisciplinary research and vibrant campus culture."
},
{
    id: 'PA',
    name: 'University of Pennsylvania',
    x: 892,
    y: 193,
    ranking: 11,
    tuition: 68686,
    undergrad_enrollment: 9995,
    acceptance_rate: 0.06,
    location: 'Philadelphia, PA',
    description: "Ivy League powerhouse combining strong business (Wharton), nursing, law, and medical programs with an urban campus."
},
{ id: 'CL', name: 'Cornell University', x: 863, y: 150, ranking: 12,
    location: 'Ithaca, NY',
    tuition: 69314,
    undergrad_enrollment: 16071,
    acceptance_rate: 0.08,
    description: "Ivy League research university with strengths in both STEM and liberal arts, known for its expansive campus and diverse academic offerings."
},
{ id: 'CO', name: 'University of Chicago', x: 694, y: 205, ranking: 13,
    location: 'Chicago, IL',
    tuition: 69324,
    undergrad_enrollment: 7489,
    acceptance_rate: 0.05,
    description: "Elite research university noted for rigorous academics, economics (“Chicago School”), and top‑ranked law and business programs."
},
{ id: 'CA1', name: 'Columbia University', x: 914, y: 170, ranking: 14,
    location: 'New York, NY',
    tuition: 71170,
    undergrad_enrollment: 8902,
    acceptance_rate: 0.04,
    description: "Urban Ivy with globally-oriented programs, strong journalism, business and medical schools, situated in NYC’s Morningside Heights."
},
{ id: 'DH', name: 'Dartmouth College', x: 911, y: 96, ranking: 15,
    location: 'Hanover, NH',
    tuition: 68019,
    undergrad_enrollment: 4447,
    acceptance_rate: 0.06,
    description: "Compact Ivy College emphasizing undergraduate teaching, liberal arts, and close-knit residential communities."
},
{ id: 'LA', name: 'University of California, Los Angeles', x: 200, y: 332, ranking: 16,
    location: 'Los Angeles, CA',
    in_state_tuition: 14208,
    out_state_tuition: 46503,
    undergrad_enrollment: 33040,
    acceptance_rate: 0.09,
    description: "Top public university with elite arts, engineering, and life sciences programs—also strong in social mobility and innovation."
},
{ id: 'BY', name: 'University of California, Berkeley', x: 169, y: 241, ranking: 17,
    location: 'Berkeley, CA',
    in_state_tuition: 16832,
    out_state_tuition: 51032,
    undergrad_enrollment: 33405,
    acceptance_rate: 0.12,
    description: "Premier public research institution notable for public impact, STEM leadership, and rich cultural activism."
},
{ id: 'RE', name: 'Rice University', x: 591, y: 450, ranking: 18,
    location: 'Houston, TX',
    tuition: 60709,
    undergrad_enrollment: 4574,
    acceptance_rate: 0.08,
    description: "Selective private research university with intimate class sizes and strengths in engineering, science, and architecture."
},
{ id: 'ND', name: 'University of Notre Dame', x: 729, y: 203, ranking: 19,
    location: 'Notre Dame, IN',
    tuition: 65025,
    undergrad_enrollment: 8968,
    acceptance_rate: 0.12,
    description: "Catholic research university known for strong undergraduate experience, ethics-focused education, and spirited athletics."
},
{ id: 'VT', name: 'Vanderbilt University', x: 734, y: 312, ranking: 20,
    location: 'Nashville, TN',
    tuition: 67498,
    undergrad_enrollment: 7152,
    acceptance_rate: 0.06,
    description: "Research powerhouse with notable programs in medicine, education, engineering, and strong on-campus resources."
},
{ id: 'CMU', name: 'Carnegie Mellon University', x: 827, y: 204, ranking: 21,
    location: 'Pittsburgh, PA',
    tuition: 65636,
    undergrad_enrollment: 7706,
    acceptance_rate: 0.11,
    description: "Global leader in computer science, robotics, and arts — blending tech innovation with creative arts."
},
{ id: 'AA', name: 'University of Michigan', x: 760, y: 177, ranking: 22,
    location: 'Ann Arbor, MI',
    in_state_tuition: 18848,
    out_state_tuition: 63081,
    undergrad_enrollment: 33730,
    acceptance_rate: 0.18,
    description: "Top-tier public university boasting a storied engineering school, business programs, and vibrant student life."
},
{ id: 'SL', name: 'Washington University in St. Louis', x: 670, y: 275, ranking: 23,
    location: 'St. Louis, MO',
    tuition: 65790,
    undergrad_enrollment: 8267,
    acceptance_rate: 0.12,
    description: "Private research university lauded for medicine, social sciences, and strong entrepreneurship programs."
},
{ id: 'EY', name: 'Emory University', x: 783, y: 354, ranking: 24,
    location: 'Atlanta, GA',
    tuition: 64280,
    undergrad_enrollment: 7359,
    acceptance_rate: 0.11,
    description: "Comprehensive research institution known for health sciences, public health, and strong liberal arts curricula."
},
{ id: 'GN', name: 'Georgetown University', x: 875, y: 223, ranking: 25,
    location: 'Washington, DC',
    tuition: 68016,
    undergrad_enrollment: 7968,
    acceptance_rate: 0.13,
    description: "A prestigious private university known for strong programs in international affairs, law, business, and political science. Its location in DC offers unmatched opportunities for internships and policy engagement."
},
{ id: 'VA', name: 'University of Virginia', x: 863, y: 245, ranking: 26,
    location: 'Charlottesville, VA',
    in_state_tuition: 23118,
    out_state_tuition: 60907,
    undergrad_enrollment: 17618,
    acceptance_rate: 0.17,
    description: "A historic public research university famed for its strong liberal arts curriculum, business, and law schools. It balances a strong tradition with rigorous academics and vibrant campus life."
},
{ id: 'CH', name: 'University of North Carolina at Chapel Hill', x: 862, y: 290, ranking: 27,
    location: 'Chapel Hill, NC',
    in_state_tuition: 9003,
    out_state_tuition: 41211,
    undergrad_enrollment: 20880,
    acceptance_rate: 0.19,
    description: "A flagship public university known for its excellence in health sciences, business, journalism, and social sciences. UNC is also recognized for strong research and vibrant athletics."
},
{ id: 'SC', name: 'University of Southern California', x: 212, y: 338, ranking: 28,
    location: 'Los Angeles, CA',
    tuition: 71647,
    undergrad_enrollment: 21023,
    acceptance_rate: 0.10,
    description: "A leading private research university with strengths in film, business, engineering, and the arts. USC leverages its LA location for industry connections and diverse student life."
},
{ id: 'SD', name: 'University of California, San Diego', x: 227, y: 361, ranking: 29,
    location: 'La Jolla, CA',
    in_state_tuition: 16815,
    out_state_tuition: 51015,
    undergrad_enrollment: 33792,
    acceptance_rate: 0.25,
    description: "A top-ranked public research university with standout programs in biological sciences, engineering, and oceanography. UCSD is also known for its interdisciplinary research culture."
},
{ id: 'NY', name: 'New York University', x: 910, y: 167, ranking: 30,
    location: 'New York, NY',
    tuition: 62796,
    undergrad_enrollment: 29760,
    acceptance_rate: 0.09,
    description: "A major private research university with global reach and strengths in arts, business, law, and social sciences. NYU’s urban campus offers rich cultural and professional opportunities."
},
{ id: 'FA', name: 'University of Florida', x: 827, y: 422, ranking: 31,
    location: 'Gainesville, FL',
    in_state_tuition: 6381,
    out_state_tuition: 28658,
    undergrad_enrollment: 34924,
    acceptance_rate: 0.24,
    description: "A large public research university recognized for its programs in engineering, business, law, and health sciences. UF is known for its vibrant campus and competitive sports programs."
},
{ id: 'AN', name: 'University of Texas at Austin', x: 561, y: 441, ranking: 32,
    location: 'Austin, TX',
    in_state_tuition: 11678,
    out_state_tuition: 42778,
    undergrad_enrollment: 42444,
    acceptance_rate: 0.29,
    description: "A flagship public university known for its excellent business, engineering, law, and computer science programs. UT Austin is embedded in a thriving tech and cultural hub."
},
{ id: 'GIT', name: 'Georgia Institute of Technology', x: 788, y: 354, ranking: 33,
    location: 'Atlanta, GA',
    in_state_tuition: 12058,
    out_state_tuition: 34484,
    undergrad_enrollment: 19505,
    acceptance_rate: 0.16,
    description: "A leading public research university renowned for engineering, computing, and business. Georgia Tech is a top choice for STEM fields with strong industry partnerships."
},
{ id: 'DS', name: 'University of California, Davis', x: 178, y: 235, ranking: 34,
    location: 'Davis, CA',
    in_state_tuition: 15794,
    out_state_tuition: 47682,
    undergrad_enrollment: 31797,
    acceptance_rate: 0.42,
    description: "A public research university with strengths in agriculture, veterinary medicine, environmental sciences, and biological sciences. UC Davis is also recognized for sustainability efforts."
},
{ id: 'IE', name: 'University of California, Irvine', x: 218, y: 343, ranking: 35,
    location: 'Irvine, CA',
    in_state_tuition: 14737,
    out_state_tuition: 46626,
    undergrad_enrollment: 29503,
    acceptance_rate: 0.26,
    description: "Known for strong programs in computer science, engineering, and business, UC Irvine is a growing research university with a diverse student body."
},
{ id: 'UC', name: 'University of Illinois at Urbana-Champaign', x: 699, y: 232, ranking: 36,
    location: 'Urbana and Champaign, IL',
    in_state_tuition: 17640,
    out_state_tuition: 36760,
    undergrad_enrollment: 35564,
    acceptance_rate: 0.44,
    description: "A leading public research university famous for engineering, business, and computer science. UIUC is a powerhouse in innovation and research output."
},
{ id: 'BNC', name: 'Boston College', x: 937, y: 130, ranking: 37,
    location: 'Chestnut Hill, MA',
    tuition: 70702,
    undergrad_enrollment: 9575,
    acceptance_rate: 0.16,
    description: "A private Jesuit university with a strong liberal arts focus, well-regarded business school, and vibrant campus culture rooted in community and service."
},
{ id: 'TS', name: 'Tufts University', x: 937, y: 124, ranking: 38,
    location: 'Medford/Somerville, MA',
    tuition: 70704,
    undergrad_enrollment: 6877,
    acceptance_rate: 0.10,
    description: "Known for its strong international relations program, biomedical sciences, and interdisciplinary studies, Tufts blends research rigor with civic engagement."
},
{ id: 'SB', name: 'University of California, Santa Barbara', x: 187, y: 322, ranking: 39,
    location: 'Santa Barbara, CA',
    in_state_tuition: 15460,
    out_state_tuition: 47755,
    undergrad_enrollment: 23232,
    acceptance_rate: 0.28,
    description: "A public research university famous for environmental sciences, physics, and marine biology. UCSB boasts a beautiful campus on the California coast."
},
{ id: 'MN', name: 'University of Wisconsin - Madison', x: 674, y: 171, ranking: 40,
    location: 'Madison, WI',
    in_state_tuition: 11603,
    out_state_tuition: 42103,
    undergrad_enrollment: 37817,
    acceptance_rate: 0.43,
    description: "A flagship public research university with strong programs in biological sciences, engineering, education, and social sciences. UW–Madison is known for spirited campus life and research excellence."
},
{ id: 'BNU', name: 'Boston University', x: 947, y: 125, ranking: 41,
    location: 'Boston, MA',
    tuition: 68102,
    undergrad_enrollment: 18656,
    acceptance_rate: 0.11,
    description: "A private research university with strong programs in communications, health sciences, and business, located in the heart of Boston’s vibrant urban setting."
},
{ id: 'OS', name: 'Ohio State University', x: 779, y: 227, ranking: 42,
    location: 'Columbus, OH',
    in_state_tuition: 13244,
    out_state_tuition: 45728,
    undergrad_enrollment: 45728,
    acceptance_rate: 0.51,
    description: "A large public research university known for its extensive academic offerings, research output, and competitive athletics."
},
{ id: 'NB', name: 'Rutgers University - New Brunswick', x: 906, y: 182, ranking: 43,
    location: 'New Brunswick, NJ',
    in_state_tuition: 17929,
    out_state_tuition: 37441,
    undergrad_enrollment: 36588,
    acceptance_rate: 0.65,
    description: "A major public research university with strengths in business, engineering, and the sciences, part of New Jersey’s flagship university system."
},
{ id: 'CP', name: 'University of Maryland, College Park', x: 877, y: 217, ranking: 44,
    location: 'College Park, MD',
    in_state_tuition: 11808,
    out_state_tuition: 41186,
    undergrad_enrollment: 30608,
    acceptance_rate: 0.45,
    description: "A leading public research university recognized for programs in engineering, business, and public policy, located near Washington, DC."
},
{ id: 'RR', name: 'University of Rochester', x: 848, y: 144, ranking: 45,
    location: 'Rochester, NY',
    tuition: 67124,
    undergrad_enrollment: 6764,
    acceptance_rate: 0.36,
    description: "A private research university noted for its rigorous academics, strong programs in health sciences, optics, and music."
},
{ id: 'LH', name: 'Lehigh University', x: 890, y: 180, ranking: 46,
    location: 'Bethlehem, PA',
    tuition: 64980,
    undergrad_enrollment: 5811,
    acceptance_rate: 0.29,
    description: "A private research university with strong engineering, business, and arts programs, known for combining technical rigor with liberal arts."
},
{ id: 'WL', name: 'Purdue University', x: 720, y: 226, ranking: 47,
    location: 'West Lafayette, IN',
    in_state_tuition: 9992,
    out_state_tuition: 28794,
    undergrad_enrollment: 39170,
    acceptance_rate: 0.50,
    description: "A top public university recognized nationally for its engineering, technology, and agricultural programs."
},
{ id: 'GA', name: 'University of Georgia', x: 797, y: 343, ranking: 48,
    location: 'Athens, GA',
    in_state_tuition: 11440,
    out_state_tuition: 31687,
    undergrad_enrollment: 31514,
    acceptance_rate: 0.37,
    description: "Georgia's flagship public university with strengths in business, law, education, and environmental sciences."
},
{ id: 'WN', name: 'University of Washington', x: 218, y: 53, ranking: 49,
    location: 'Seattle, WA',
    in_state_tuition: 12973,
    out_state_tuition: 43209,
    undergrad_enrollment: 39125,
    acceptance_rate: 0.43,
    description: "A leading public research university noted for its medical, engineering, and computer science programs in a thriving tech hub."
},
{ id: 'WF', name: 'Wake Forest University', x: 830, y: 293, ranking: 50,
    location: 'Winston-Salem, NC',
    tuition: 67642,
    undergrad_enrollment: 5471,
    acceptance_rate: 0.22,
    description: "A private university known for its small class sizes, strong liberal arts, business, and health sciences programs."
},
{
    id: 'MIT',
    name: 'Massachusetts Institute of Technology',
    x: 942,
    y: 126,
    ranking: 2,
    tuition: 62396,
    undergrad_enrollment: 4576,
    acceptance_rate: 0.05,
    image: "https://www.usnews.com/dims4/USNEWS/9443edf/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fa8%2Fc5193da7eb9dcbd26e794c018ac87a%2Fcollege-photo_6935.jpg",
    location: 'Cambridge, MA',
    description: "Global leader in STEM education, innovation, and cutting-edge research with a strong entrepreneurial ecosystem."
},
{ id: 'CW', name: 'Case Western Reserve University', x: 796, y: 190, ranking: 51,
    location: 'Cleveland, OH',
    tuition: 66605,
    undergrad_enrollment: 6186,
    acceptance_rate: 0.29,
    description: "A private research university with strong engineering, biomedical, and business programs."
},
{ id: 'AM', name: 'Texas A&M University', x: 578, y: 436, ranking: 52,
    location: 'College Station, TX',
    in_state_tuition: 12413,
    out_state_tuition: 40307,
    undergrad_enrollment: 59933,
    acceptance_rate: 0.63,
    description: "A major public research university known for engineering, agriculture, and military programs."
},
{ id: 'VTH', name: 'Virginia Tech', x: 832, y: 271, ranking: 53,
    location: 'Blacksburg, VA',
    in_state_tuition: 15948,
    out_state_tuition: 37158,
    undergrad_enrollment: 30504,
    acceptance_rate: 0.57,
    image: "https://www.usnews.com/dims4/USNEWS/fb8035c/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F3f%2F65%2F731588c84b86bdfb8cd106aa55d6%2Fwalkingdowntown.jpg",
    description: "A public university recognized for engineering, architecture, and strong ROTC programs."
},
{ id: 'FSU', name: 'Florida State University', x: 791, y: 421, ranking: 54,
    location: 'Tallahassee, FL',
    in_state_tuition: 6517,
    out_state_tuition: 21683,
    undergrad_enrollment: 32217,
    acceptance_rate: 0.25,
    image: "https://www.usnews.com/dims4/USNEWS/8c10889/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fbb%2F7003562f043ea2e299d5a44d9c0bbc%2F11_0241_%28011%29.jpg",
    description: "A large public university with solid programs in the arts, sciences, and competitive athletics."
},
{ id: 'NEN', name: 'Northeastern University', x: 942, y: 117, ranking: 55,
    location: 'Boston, MA',
    tuition: 66162,
    undergrad_enrollment: 15891,
    acceptance_rate: 0.06,
    image: "https://www.usnews.com/dims4/USNEWS/f8707bf/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fe1%2F1b90a6c2bc7db452b8e899bc6a4a39%2Fcollege-photo_31412.jpg",
    description: "A private research university known for its co-op program integrating real-world work experience."
},
{ id: 'TC', name: 'University of Minnesota - Twin Cities', x: 613, y: 147, ranking: 56,
    location: 'Minneapolis, MN',
    tuition: 38362,
    undergrad_enrollment: 17214,
    acceptance_rate: 0.77,
    image: "https://www.usnews.com/dims4/USNEWS/eb48997/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F1a%2F57ee27ac94e22161e9c049b7e44c48%2Fcollege-photo_25995.jpg",
    description: "A flagship public research university with strengths in health sciences, engineering, and business."
},
{ id: 'WM', name: 'College of William & Mary - William Mary', x: 883, y: 255, ranking: 57,
    location: 'Williamsburg, VA',
    in_state_tuition: 26019,
    out_state_tuition: 50752,
    undergrad_enrollment: 6963,
    acceptance_rate: 0.33,
    image: "https://www.usnews.com/dims4/USNEWS/a63437d/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F28%2F9522c9217db89722506ec55bb1894a%2FWren-slide.jpg",
    description: "One of the oldest public universities in the U.S., with strong programs in law, business, and liberal arts."
},
{ id: 'RH', name: 'North Carolina State University', x: 875, y: 289, ranking: 58,
    location: 'Raleigh, NC',
    in_state_tuition: 8986,
    out_state_tuition: 33034,
    undergrad_enrollment: 27323,
    acceptance_rate: 0.40,
    image: "https://www.usnews.com/dims4/USNEWS/cb913c5/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F6a%2Fab%2F4d1b9a3d45b296fb942c1d7f3100%2Fbk-3378-hero.jpg",
    description: "A public research university noted for its engineering, agriculture, and technology programs."
},
{ id: 'STB', name: 'The State University of New York at Stony Brook', x: 922, y: 166, ranking: 59,
    location: 'Stony Brook, NY',
    in_state_tuition: 10644,
    out_state_tuition: 32454,
    undergrad_enrollment: 17549,
    acceptance_rate: 0.49,
    image: "https://www.usnews.com/dims4/USNEWS/47c62f3/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fda%2F55f9c218f25686c56dd9095c8a2c2f%2Fcollege-photo_34218.jpg",
    description: "A leading public research university in the SUNY system, strong in health sciences and engineering."
},
{ id: 'MD', name: 'University of California, Merced', x: 192, y: 268, ranking: 60,
    location: 'Merced, CA',
    in_state_tuition: 14610,
    out_state_tuition: 46905,
    undergrad_enrollment: 8373,
    acceptance_rate: 0.89,
    image: "https://www.usnews.com/dims4/USNEWS/2ed2ca1/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F3a%2F7d27c65e9b048bc5df00a8b252c85e%2Fcrop-g-UCM_Campus_2020_DB_057_e.jpg",
    description: "The newest UC campus, focused on research in environmental sciences and engineering."
},
{ id: 'AT', name: 'University of Massachusetts - Amherst', x: 919, y: 134, ranking: 61,
    location: 'Amherst, MA',
    in_state_tuition: 17772,
    out_state_tuition: 40449,
    undergrad_enrollment: 23936,
    acceptance_rate: 0.58,
    image: "https://www.usnews.com/dims4/USNEWS/f1881df/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F7a%2F69%2F0ca70dd84cbb8525bf7eb5edf093%2F20160517-160over90-viewbook-0693.jpg",
    description: "The flagship public research university of Massachusetts, with diverse programs in business, engineering, and the sciences."
},
{ id: 'VLL', name: 'Villanova University', x: 886, y: 192, ranking: 62,
    location: 'Villanova, PA',
    tuition: 67776,
    undergrad_enrollment: 7065,
    acceptance_rate: 0.25,
    image: "https://www.usnews.com/dims4/USNEWS/4f73914/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fac%2Fc5781ac26261fc6a4d9fa9a8477ddd%2Fcollege-photo_35418.jpg",
    description: "A private university known for business, engineering, and strong liberal arts education with a Catholic tradition."
},
{ id: 'BS', name: 'Brandeis University', x: 931, y: 125, ranking: 63,
    location: 'Waltham, MA',
    tuition: 68080,
    undergrad_enrollment: 3675,
    acceptance_rate: 0.35,
    image: "https://www.usnews.com/dims4/USNEWS/8e92bfe/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F2a%2Fa463251ce974ebae64dd9b13f6484b%2F_MG_9777.jpg",
    description: "A private research university with strengths in social sciences, humanities, and health sciences."
},
{ id: 'GW', name: 'George Washington University', x: 871, y: 219, ranking: 64,
    location: 'Washington, DC',
    tuition: 67710,
    undergrad_enrollment: 11387,
    acceptance_rate: 0.44,
    image: "https://www.usnews.com/dims4/USNEWS/832331f/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F93%2F742265d75c507c9b4d74c460544823%2Fcollege-photo_25925.jpg",
    description: "A private university with strong programs in international affairs, political science, and business."
},
{ id: 'MS', name: 'Michigan State University', x: 744, y: 167, ranking: 65,
    location: 'East Lansing, MI',
    in_state_tuition: 18826,
    out_state_tuition: 45178,
    undergrad_enrollment: 40483,
    acceptance_rate: 0.84,
    image: "https://www.usnews.com/dims4/USNEWS/b776767/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F64%2F8948b60c1375c3871898da724f2083%2Fcollege-photo_15870.jpg",
    description: "A large public research university known for business, education, and agriculture programs."
},
{ id: 'UP', name: 'Pennsylvania State University', x: 853, y: 188, ranking: 66,
    location: 'University Park, PA',
    in_state_tuition: 20644,
    out_state_tuition: 41790,
    undergrad_enrollment: 42223,
    acceptance_rate: 0.54,
    image: "https://www.usnews.com/dims4/USNEWS/2b95099/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F0e%2F5de474cdda2fe39ff0c60d2db0259e%2Fcollege-photo_5953.jpg",
    description: "A major public research university with extensive programs in engineering, business, and agriculture. Penn State is known for its large campus and vibrant student life."
},
{ id: 'SCU', name: 'Santa Clara University', x: 170, y: 257, ranking: 67,
    location: 'Santa Clara, CA',
    tuition: 61293,
    undergrad_enrollment: 6249,
    acceptance_rate: 0.44,
    image: "https://www.usnews.com/dims4/USNEWS/490b853/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F65%2F239a8254f5a651654163bad9fee55a%2FJL160917_4111_CampusBeauty_0259.jpg",
    description: "A private Jesuit university noted for strong business, engineering, and law programs, located in Silicon Valley, offering great tech industry connections."
},
{ id: 'TL', name: 'Tulane University', x: 685, y: 439, ranking: 68,
    location: 'New Orleans, LA',
    tuition: 68678,
    undergrad_enrollment: 7295,
    acceptance_rate: 0.15,
    image: "https://www.usnews.com/dims4/USNEWS/bfcb37d/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fa3%2F27198a7ba9d4c2909e318d3da75173%2Fcollege-photo_34989.jpg",
    description: "A private research university known for its programs in law, architecture, public health, and its active community engagement in New Orleans."
},
{ id: 'MI', name: 'University of Miami', x: 878, y: 501, ranking: 69,
    location: 'Coral Gables, FL',
    tuition: 62616,
    undergrad_enrollment: 12883,
    acceptance_rate: 0.19,
    image: "https://www.usnews.com/dims4/USNEWS/4d82e19/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fdc%2F2e%2Fd22486c04e3fb227d21d976d9c0c%2Fumiamihero-1920x760.jpg",
    description: "A private research university with strengths in marine science, music, business, and medicine, located near Miami’s dynamic urban center."
},
{ id: 'RPI', name: 'Rensselaer Polytechnic Institute', x: 897, y: 132, ranking: 70,
    location: 'Troy, NY',
    tuition: 64081,
    undergrad_enrollment: 5945,
    acceptance_rate: 0.59,
    image: "https://www.usnews.com/dims4/USNEWS/d757838/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F62%2Fdf%2F97c02641404cbda594288dcae2f3%2Forigstudentconnect-college.jpg",
    description: "One of the oldest technological research universities in the U.S., renowned for engineering, computer science, and architecture."
},
{ id: 'CT', name: 'University of Connecticut', x: 927, y: 144, ranking: 71,
    location: 'Storrs, CT',
    in_state_tuition: 21044,
    out_state_tuition: 43712,
    undergrad_enrollment: 19388,
    acceptance_rate: 0.54,
    image: "https://www.usnews.com/dims4/USNEWS/2f32702/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fd1%2F202f4160cac59750a606d3da18307f%2Fcollege-photo_18368.jpg",
    description: "The flagship public university in Connecticut, known for programs in business, engineering, and health sciences."
},
{ id: 'PH', name: 'University of Pittsburgh', x: 822, y: 199, ranking: 72,
    location: 'Pittsburgh, PA',
    in_state_tuition: 21926,
    out_state_tuition: 41430,
    undergrad_enrollment: 20220,
    acceptance_rate: 0.50,
    image: "https://www.usnews.com/dims4/USNEWS/0b079a5/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fcb%2F27750e68ae1da0cb0935e0a9b92eba%2Fcollege-photo_31411.jpg",
    description: "A public research university strong in health sciences, engineering, and philosophy, located in a growing urban research hub."
},
{ id: 'BNS', name: 'The State University of New York at Binghamton', x: 877, y: 151, ranking: 73,
    location: 'Binghamton, NY',
    in_state_tuition: 10363,
    out_state_tuition: 30243,
    undergrad_enrollment: 14408,
    acceptance_rate: 0.38,
    image: "https://www.usnews.com/dims4/USNEWS/87a1390/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F4b%2Fe2c046fb1c3ae257f28abef818079c%2Fcollege-photo_21371.jpg",
    description: "A public research university known for strong programs in business, engineering, and liberal arts, part of the SUNY system."
},
{ id: 'IBN', name: 'Indiana University - Bloomington', x: 730, y: 257, ranking: 74,
    location: 'Bloomington, IN',
    in_state_tuition: 12144,
    out_state_tuition: 41891,
    undergrad_enrollment: 36833,
    acceptance_rate: 0.80,
    image: "https://www.usnews.com/dims4/USNEWS/a22498b/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fec%2Fd5%2F6f9f2c2649889aabf5ac09878824%2F20200424-springcampusscenics-jb-0023.jpg",
    description: "A large public university recognized for its business, music, and public affairs programs, with a strong liberal arts tradition."
},
{ id: 'SEU', name: 'Syracuse University', x: 868, y: 139, ranking: 75,
    location: 'Syracuse, NY',
    tuition: 65528,
    undergrad_enrollment: 15739,
    acceptance_rate: 0.42,
    image: "https://www.usnews.com/dims4/USNEWS/4d4c993/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fcb%2F53a7cc282100311bf0c29d16c2a67c%2Fcollege-photo_22933.jpg",
    description: "A private research university known for communications, business, and public administration programs, with a vibrant campus life."
},
{ id: 'CSM', name: 'Colorado School of Mines', x: 435, y: 252, ranking: 76,
    location: 'Golden, CO',
    in_state_tuition: 21186,
    out_state_tuition: 44376,
    undergrad_enrollment: 5852,
    acceptance_rate: 0.60,
    image: "https://www.usnews.com/dims4/USNEWS/219fca2/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F2e%2F84cd5d4998a1fb0f1703eb14852539%2FHero_Shot_-_Guggenheim_a.jpg",
    description: "A public university specializing in engineering and applied sciences, particularly known for mining, geology, and environmental engineering."
},
{ id: 'SIT', name: 'Stevens Institute of Technology', x: 912, y: 174, ranking: 77,
    location: 'Hoboken, NJ',
    tuition: 63462,
    undergrad_enrollment: 4026,
    acceptance_rate: 0.43,
    image: "https://www.usnews.com/dims4/USNEWS/9e356b0/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fa8%2Fe21b1a4c78eec18a599763e6e6fa44%2Fcollege-photo_26182.jpg",
    description: "A private research university focused on engineering, computer science, and business, with a close connection to New York City industries."
},
{ id: 'UB', name: 'University at Buffalo', x: 828, y: 155, ranking: 78,
    location: 'Buffalo, NY',
    in_state_tuition: 10781,
    out_state_tuition: 30571,
    undergrad_enrollment: 20463,
    acceptance_rate: 0.69,
    image: "https://www.usnews.com/dims4/USNEWS/b493ef8/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F77%2Fd11664668f460e23962439d7ffadeb%2Fstadium-DJI_0047_1.jpg",
    description: "The largest public university in New York State, known for health sciences, engineering, and research programs."
},
{ id: 'RVE', name: 'University of California, Riverside', x: 218, y: 337, ranking: 79,
    location: 'Riverside, CA',
    in_state_tuition: 14316,
    out_state_tuition: 48516,
    undergrad_enrollment: 22646,
    acceptance_rate: 0.70,
    image: "https://www.usnews.com/dims4/USNEWS/e2fb274/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F6c%2F68f3515aea1ba176103a16ba099ccf%2Fcollege-photo_13243.jpg",
    description: "A public research university with growing strengths in agriculture, environmental sciences, and engineering."
},
{ id: 'CN', name: 'Clemson University', x: 805, y: 330, ranking: 80,
    location: 'Clemson, SC',
    in_state_tuition: 15554,
    out_state_tuition: 39498,
    undergrad_enrollment: 22875,
    acceptance_rate: 0.38,
    image: "https://www.usnews.com/dims4/USNEWS/8b41dde/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fc3%2F836acf068a9b227834e0adda226ac2%2FPicture1.jpg",
    description: "A public research university recognized for engineering, business, and strong cooperative education programs."
},
{ id: 'PPD', name: 'Pepperdine University', x: 195, y: 328, ranking: 81,
    location: 'Malibu, CA',
    tuition: 69918,
    undergrad_enrollment: 3629,
    acceptance_rate: 0.50,
    image: "https://www.usnews.com/dims4/USNEWS/64b8fd0/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Ffe%2Fa865facc742e3b4b4c31863dd42e82%2Fcollege-photo_6515.jpg",
    description: "A private university known for its business, law, and liberal arts programs, located on a scenic coastal campus."
},
{ id: "RRS", name: "Rutgers University - Newark", x: 903, y: 176, ranking: 82,
    location: "Newark, NJ",
    in_state_tuition: 17250,
    out_state_tuition: 36762,
    undergrad_enrollment: 7417,
    acceptance_rate: 0.79,
    image: "https://www.usnews.com/dims4/USNEWS/6f6b773/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fe2%2Fdf1e430bd929ca578704004ed2689f%2Fcollege-photo_36380.jpg",
    description: "A public research campus of Rutgers with a strong focus on social mobility, economic access, engineering, business, and public administration."
},
{ id: "ICO", name: "University of Illinois at Chicago", x: 701, y: 194, ranking: 83,
    location: "Chicago, IL",
    in_state_tuition: 18180,
    out_state_tuition: 33726,
    undergrad_enrollment: 22107,
    acceptance_rate: 0.79,
    image: "https://www.usnews.com/dims4/USNEWS/aac706c/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fe9%2F6d907501915ba1862cb6beb9b68690%2Fcollege-photo_9965.jpg",
    description: "An urban public university recognized for health sciences, engineering, social research, and strong community partnerships."
},
{ id: "NJT", name: "New Jersey Institute of Technology", x: 915, y: 183, ranking: 84,
    location: "Newark, NJ",
    in_state_tuition: 19000,
    out_state_tuition: 35912,
    undergrad_enrollment: 9523,
    acceptance_rate: 0.67,
    image: "https://www.usnews.com/dims4/USNEWS/3d4614d/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F7e%2Fb3b8e2741b92a0ea183c9bec080001%2Fcollege-photo_33255.jpg",
    description: "A public polytechnic known for its engineering, architecture, and computer science programs."
},
{ id: "CSC", name: "University of California, Santa Cruz", x: 169, y: 268, ranking: 85,
    location: "Santa Cruz, CA",
    in_state_tuition: 15983,
    out_state_tuition: 50183,
    undergrad_enrollment: 17812,
    acceptance_rate: 0.61,
    image: "https://www.usnews.com/dims4/USNEWS/2505fca/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F8e%2Ffa0566a5854bafa34cbf50251bf6e0%2Fcollege-photo_25690.jpg",
    description: "A public university with strengths in marine biology, environmental science, computer science, and liberal arts."
},
{ id: "DXL", name: "Drexel University", x: 893, y: 199, ranking: 86,
    location: "Philadelphia, PA",
    tuition: 62412,
    undergrad_enrollment: 12099,
    acceptance_rate: 0.78,
    image: "https://www.usnews.com/dims4/USNEWS/8729c93/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fcd%2Ff35e75d608aaf118054bf4c91d82af%2Fcollege-photo_12760.jpg",
    description: "A private research university best known for its cooperative education model and programs in engineering, computing, and business."
},
{ id: "HDU", name: "Howard University", x: 864, y: 220, ranking: 87,
    location: "Washington, DC",
    tuition: 35810,
    undergrad_enrollment: 10190,
    acceptance_rate: 0.35,
    image: "https://www.usnews.com/dims4/USNEWS/2296c88/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F82%2F7bbabaea5b47be61379d37af47e531%2FHowardUniversity-FoundersLibrary.jpg",
    description: "A leading historically Black university offering strong programs across liberal arts, STEM, health sciences, and professional fields."
},
{ id: "MQ", name: "Marquette University", x: 693, y: 171, ranking: 88,
    location: "Milwaukee, WI",
    tuition: 51170,
    undergrad_enrollment: 7652,
    acceptance_rate: 0.87,
    image: "https://www.usnews.com/dims4/USNEWS/713240b/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F03%2Fd3%2Fb790c5454f42b875628afc122a5e%2Figgy-in-mke.jpeg",
    description: "A private Jesuit institution offering reputable programs in business, engineering, communication, and the health sciences."
},
{ id: "DLE", name: "University of Delaware", x: 892, y: 206, ranking: 89,
    location: "Newark, DE",
    in_state_tuition: 16810,
    out_state_tuition: 41400,
    undergrad_enrollment: 19119,
    acceptance_rate: 0.64,
    image: "https://www.usnews.com/dims4/USNEWS/825fad1/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F10%2F08e0c8826acc486c0de84f78b8b49d%2FCampus-043021-004.jpg",
    description: "The flagship public university of Delaware with recognized programs in business, engineering, education, and the sciences."
},
{ id: "WPI", name: "Worcester Polytechnic Institute", x: 928, y: 133, ranking: 90,
    location: "Worcester, MA",
    tuition: 60765,
    undergrad_enrollment: 5453,
    acceptance_rate: 0.58,
    image: "https://www.usnews.com/dims4/USNEWS/a3b68e4/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F5d%2Fa0%2Fd0d7e91e4bfe85d97c472fac6e1e%2Fcustom-hero-1920x760.png",
    description: "A private STEM-focused university known for project-based learning in engineering, computer science, and robotics."
},
{ id: "AMN", name: "American University", x: 868, y: 224, ranking: 91,
    location: "Washington, DC",
    tuition: 58772,
    undergrad_enrollment: 7817,
    acceptance_rate: 0.47,
    image: "https://www.usnews.com/dims4/USNEWS/e3bb7a9/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F8e%2Fae%2F6d0137264e43877d52b970fa81e0%2Famerican-university-glover-gate-option-2-hero.jpg",
    description: "A private university known for international relations, political science, communication, and public policy."
},
{ id: "BYL", name: "Baylor University", x: 568, y: 421, ranking: 92,
    location: "Waco, TX",
    tuition: 58100,
    undergrad_enrollment: 15155,
    acceptance_rate: 0.51,
    image: "https://www.usnews.com/dims4/USNEWS/18766bc/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F24%2F98%2F2a305d674ae2be252eb325903811%2Fphoto-21-main-hero-baylor-line-copy.jpg",
    description: "A private Christian university offering well-established programs in business, law, pre-health, and education."
},
{ id: "FDM", name: "Fordham University", x: 907, y: 158, ranking: 93,
    location: "New York, NY",
    tuition: 64470,
    undergrad_enrollment: 10307,
    acceptance_rate: 0.56,
    image: "https://www.usnews.com/dims4/USNEWS/64d52e1/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F7d%2F2c660496b823f534b6a70c2e3eb2cc%2Fcollege-photo_12860.jpg",
    description: "A Jesuit university known for its strong schools of business, law, communications, and liberal arts."
},
{ id: "LMU", name: "Loyola Marymount University", x: 203, y: 339, ranking: 94,
    location: "Los Angeles, CA",
    tuition: 61862,
    undergrad_enrollment: 7336,
    acceptance_rate: 0.40,
    image: "https://www.usnews.com/dims4/USNEWS/6084013/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F95%2F1e%2F57311f06430a8bbdf230074f0713%2Fupdated-hero-image.png",
    description: "A private Jesuit university recognized for liberal arts, business, film, and communications programs."
},
{ id: "RIT", name: "Rochester Institute of Technology", x: 844, y: 148, ranking: 95,
    location: "Rochester, NY",
    tuition: 59274,
    undergrad_enrollment: 14076,
    acceptance_rate: 0.71,
    image: "https://www.usnews.com/dims4/USNEWS/8a793ac/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fea%2F18%2Fdb909aba4d83963e3c02bfc3febc%2F01-20240429-njt-tigerstatue-a-webbrs.jpg",
    description: "A private university focused on technology, design, computing, and applied sciences, with a strong co-op education system."
},
{ id: "SMU", name: "Southern Methodist University", x: 574, y: 397, ranking: 96,
    location: "Dallas, TX",
    tuition: 67038,
    undergrad_enrollment: 7115,
    acceptance_rate: 0.61,
    image: "https://www.usnews.com/dims4/USNEWS/3685fec/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2F22%2Fda45ba18cafc60ba764ec300a6f899%2Fcollege-photo_15195.jpg",
    description: "A private university with notable programs in business, engineering, law, and the arts, offering a strong alumni network."
},
{ id: "USL", name: "University of South Florida", x: 832, y: 458, ranking: 97,
    location: "Tampa, FL",
    in_state_tuition: 6410,
    out_state_tuition: 17324,
    undergrad_enrollment: 37263,
    acceptance_rate: 0.41,
    image: "https://www.usnews.com/dims4/USNEWS/c196335/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Ff9%2F13afce02d3e80810dced80083ce23c%2F20170818-USF-HUDDLE_%26_USF_PHOTO-22.jpg",
    description: "A public research university with strengths in health sciences, engineering, business, and global studies."
},
{ id: "FIU", name: "Florida International University", x: 877, y: 506, ranking: 98,
    location: "Miami, FL",
    in_state_tuition: 6566,
    out_state_tuition: 18964,
    undergrad_enrollment: 44045,
    acceptance_rate: 0.59,
    image: "https://www.usnews.com/dims4/USNEWS/944a12c/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fa2%2F2dc99dc14a7b3a372776a3bc7957ff%2FScreen_Shot_2020-09-30_at_5.12.32_PM.png",
    description: "A large public university known for its diversity, international focus, business, and STEM programs."
},
{ id: "GZ", name: "Gonzaga University", x: 239, y: 50, ranking: 99,
    location: "Spokane, WA",
    tuition: 55480,
    undergrad_enrollment: 5163,
    acceptance_rate: 0.76,
    image: "https://www.usnews.com/dims4/USNEWS/41eee2b/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fc2%2F93f11440babd41bacc24e6cc1e8e65%2FCollege_Hall_US_News.jpg",
    description: "A Jesuit university offering strong undergraduate teaching, especially in business, education, engineering, and pre-law."
},
{ id: "UCB", name: "University of Colorado Boulder", x: 439, y: 249, ranking: 100,
    location: "Boulder, CO",
    in_state_tuition: 14002,
    out_state_tuition: 43622,
    undergrad_enrollment: 32100,
    acceptance_rate: 0.81,
    image: "https://www.usnews.com/dims4/USNEWS/e281b91/17177859217/resize/800x540%3E/quality/85/?url=https%3A%2F%2Fwww.usnews.com%2Fcmsmedia%2Fb7%2F029f7721431e45fe47d6a961289c63%2FCUBoulder_Campuslife1.JPG",
    description: "A flagship public university with leading programs in aerospace engineering, environmental science, physics, and business."
},
];

const TASKS = [
  { key: "questions", label: "College Questions (non-writing)", weight: 0.3 },
  { key: "writing", label: "Writing", weight: 0.4 },
  { key: "recommenders", label: "Recommenders (and FERPA)", weight: 0.2 },
  { key: "review", label: "Review & Submit", weight: 0.1 },
];

function getRandomProgress() {
  //return Math.floor(Math.random() * 101);
  return 64;
}

export default function CollegeList(props) {
  const { myColleges, addCollege, removeCollege } = useCollegeList();
  const [selected, setSelected] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [progressMap, setProgressMap] = useState({}); // { [collegeId]: { ...progressObj } }
  const [loadingProgress, setLoadingProgress] = useState(true);
  const dropdownRef = useRef(null);

  const collegesWithProgress = myColleges.map((c) => ({
    ...c,
    progress: getRandomProgress(),
  }));

  const getCollegeImage = (college) => {
    if (college.image) return college.image;
    if (collegeImages[college.id]) return collegeImages[college.id];
    return defaultCollegePic;
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleRemoveClick = (e) => {
    e.stopPropagation();
    setDialogOpen(true);
  };

  const handleDialogClose = () => setDialogOpen(false);

  const handleConfirmRemove = () => {
    selected.forEach((id) => removeCollege(id));
    setSelected([]);
    setDialogOpen(false);
  };

  const selectedColleges = collegesWithProgress.filter((c) => selected.includes(c.id));
  const selectedNames = selectedColleges.map((c) => c.name).join(", ");

  // Fetch progress from API on mount
  useEffect(() => {
    async function fetchProgress() {
      try {
        const data = await getCollegeProgress(); // { [collegeId]: { ...progressObj } }
        console.log('[DEBUG] Progress fetched from API:', data);
        setProgressMap(data || {});
      } catch (e) {
        // Optionally handle error
      } finally {
        setLoadingProgress(false);
      }
    }
    fetchProgress();
  }, []);

  // Handle checkbox change and persist to backend
  const handleProgressChange = async (collegeId, key) => {
    const prev = progressMap[collegeId] || {};
    const updated = { ...prev, [key]: !prev[key] };
    const newMap = { ...progressMap, [collegeId]: updated };
    setProgressMap(newMap);
    console.log('[DEBUG] Saving progress for', collegeId, updated);
    try {
      // Save only the progress for this college, not the whole map
      const resp = await saveCollegeProgress(collegeId, updated);
      console.log('[DEBUG] API save response:', resp);
    } catch (e) {
      // Optionally handle error, revert UI if needed
      console.error('[DEBUG] Error saving progress:', e);
    }
  };

  // Calculate progress based on checked tasks in progressMap
  function getProgress(college) {
    const tasks = progressMap[college.id] || {};
    let progress = 0;
    TASKS.forEach((t) => {
      if (tasks[t.key]) progress += t.weight;
    });
    return Math.round(progress * 100);
  }

  // Handle double click to toggle dropdown
  const handleCardDoubleClick = (collegeId) => {
    setDropdownOpenId((prev) => (prev === collegeId ? null : collegeId));
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownOpenId &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setDropdownOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpenId]);

  return (
    <div className="college-list-page">
      <h1>My College List</h1>
      <div className="college-list-cards">
        {collegesWithProgress.length === 0 ? (
          <div className="empty-list-msg">No colleges added yet.</div>
        ) : (
          collegesWithProgress.map((college) => {
            const progress = getProgress(college);
            return (
              <div key={college.id} style={{ position: "relative" }}>
                <Card
                  className={`mui-college-card${progress === 100 ? " completed-college-card" : ""} ${selected.includes(college.id) ? "selected-college-card" : ""}`}
                  onClick={() => handleSelect(college.id)}
                  onDoubleClick={() => handleCardDoubleClick(college.id)}
                  style={{ position: "relative", zIndex: dropdownOpenId === college.id ? 10 : 1 }}
                >
                  <div
                    className="college-card-image-top"
                    style={{
                      backgroundImage: `url(${getCollegeImage(college)})`,
                    }}
                  >
                    <Typography variant="h6" className="mui-college-name college-card-title-overlay">
                      {college.name}
                    </Typography>
                  </div>
                  <CardContent>
                    <Typography color="textSecondary" className="mui-college-location">
                      {college.location}
                    </Typography>
                    <Typography className="mui-college-description">
                      {college.description}
                    </Typography>
                    <div className="mui-progress-bar">
                      <div className="custom-progress-container">
                        <div
                          className="custom-progress-bar"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="mui-progress-label">{progress}%</span>
                    </div>
                  </CardContent>
                </Card>
                {/* Dropdown menu */}
                <div
                  ref={dropdownOpenId === college.id ? dropdownRef : null}
                  className={`college-dropdown-menu${dropdownOpenId === college.id ? " open" : ""}`}
                  style={{
                    maxHeight: dropdownOpenId === college.id ? 200 : 0,
                    opacity: dropdownOpenId === college.id ? 1 : 0,
                    transition: "max-height 0.3s cubic-bezier(.4,2,.6,1), opacity 0.2s",
                    overflow: "hidden",
                    background: "#f9f9f9",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    boxShadow: dropdownOpenId === college.id ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    zIndex: 20,
                    margin: "0 auto",
                    padding: dropdownOpenId === college.id ? 16 : 0,
                  }}
                  onDoubleClick={() => setDropdownOpenId(null)}
                >
                  {dropdownOpenId === college.id && (
                    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                      {TASKS.map((task) => (
                        <li key={task.key} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={progressMap[college.id]?.[task.key] || false}
                            onChange={() => handleProgressChange(college.id, task.key)}
                            id={`task-${college.id}-${task.key}`}
                          />
                          <label htmlFor={`task-${college.id}-${task.key}`} style={{ marginLeft: 8 }}>
                            {task.label} <span style={{ color: "#888", fontSize: 12 }}>({Math.round(task.weight * 100)}%)</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
        {/* Remove Button (floating, only enabled if selection) */}
        <button
          className="remove-college-btn-multi"
          onClick={handleRemoveClick}
          disabled={selected.length === 0}
          title="Remove selected from list"
        >
          <img src={trashIcon} alt="Remove" />
        </button>
        {/* Dialog */}
        <Dialog open={dialogOpen} onClose={handleDialogClose}>
          <DialogTitle>Remove Colleges</DialogTitle>
          <DialogContent>
            You will remove <b>{selectedNames}</b> from your list.
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleConfirmRemove} color="error" variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}