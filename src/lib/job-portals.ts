import type { JobSource } from "@prisma/client";

export type JobSearchFilters = {
  query: string;
  location?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  postedWithinHours?: number | null;
};

export const JOB_PORTALS: Array<{ source: JobSource; label: string; domain: string }> = [
  { source: "LINKEDIN", label: "LinkedIn", domain: "linkedin.com" },
  { source: "NAUKRI", label: "Naukri", domain: "naukri.com" },
  { source: "INDEED", label: "Indeed", domain: "indeed.com" },
  { source: "INSTAHYRE", label: "Instahyre", domain: "instahyre.com" },
  { source: "CUTSHORT", label: "Cutshort", domain: "cutshort.io" },
  { source: "HIRIST", label: "Hirist", domain: "hirist.tech" },
  { source: "WELLFOUND", label: "Wellfound", domain: "wellfound.com" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function linkedInExperienceCodes(min: number | null | undefined, max: number | null | undefined) {
  const low = min ?? 0;
  const high = max ?? low;
  const codes = new Set<string>();
  for (let years = low; years <= high; years += 1) {
    if (years <= 1) codes.add("2");
    else if (years <= 3) codes.add("3");
    else if (years <= 5) codes.add("4");
    else if (years <= 8) codes.add("5");
    else codes.add("6");
  }
  if (codes.size === 0) codes.add("2");
  return Array.from(codes).join(",");
}

export function buildPortalSearchUrl(source: JobSource, filters: JobSearchFilters) {
  const query = filters.query.trim();
  const location = filters.location?.trim() ?? "";
  const hours = filters.postedWithinHours ?? null;
  const params = new URLSearchParams();

  if (source === "LINKEDIN") {
    params.set("keywords", query);
    if (location) params.set("location", location);
    if (hours) params.set("f_TPR", `r${hours * 3600}`);
    if (filters.experienceMin != null || filters.experienceMax != null) {
      params.set("f_E", linkedInExperienceCodes(filters.experienceMin, filters.experienceMax));
    }
    return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
  }

  if (source === "NAUKRI") {
    const base = `https://www.naukri.com/job-listings-${slugify(query) || "jobs"}`;
    if (filters.experienceMin != null && filters.experienceMax != null) {
      params.set("experience", `${filters.experienceMin}-${filters.experienceMax}`);
    } else if (filters.experienceMin != null) {
      params.set("experience", `${filters.experienceMin}-50`);
    } else if (filters.experienceMax != null) {
      params.set("experience", `0-${filters.experienceMax}`);
    }
    if (location) params.set("location", location);
    if (hours) params.set("postedWithin", String(Math.ceil(hours / 24)));
    params.set("sortBy", "recency");
    const suffix = params.toString();
    return suffix ? `${base}?${suffix}` : base;
  }

  const experience =
    filters.experienceMin != null && filters.experienceMax != null
      ? `${filters.experienceMin}-${filters.experienceMax}`
      : filters.experienceMin != null
        ? `${filters.experienceMin}-50`
        : filters.experienceMax != null
          ? `0-${filters.experienceMax}`
          : null;

  if (source === "INDEED") {
    const indeedQuery = experience ? `${query} ${experience} years` : query;
    params.set("q", indeedQuery);
    if (location) params.set("l", location);
    if (hours) params.set("fromage", String(Math.max(1, Math.ceil(hours / 24))));
    params.set("sort", "date");
    return `https://www.indeed.com/jobs?${params.toString()}`;
  }

  if (source === "INSTAHYRE") {
    params.set("q", query);
    if (location) params.set("location", location);
    if (experience) params.set("experience", experience);
    if (hours) params.set("posted", String(Math.ceil(hours / 24)));
    return `https://www.instahyre.com/job-list/?${params.toString()}`;
  }

  if (source === "CUTSHORT") {
    params.set("q", query);
    if (location) params.set("location", location);
    if (experience) params.set("experience", experience);
    if (hours) params.set("posted", String(Math.ceil(hours / 24)));
    params.set("sort", "recent");
    return `https://cutshort.io/jobs?${params.toString()}`;
  }

  if (source === "HIRIST") {
    params.set("q", query);
    if (location) params.set("location", location);
    if (experience) params.set("experience", experience);
    if (hours) params.set("posted", String(Math.ceil(hours / 24)));
    params.set("sort", "latest");
    return `https://www.hirist.tech/jobs?${params.toString()}`;
  }

  // Wellfound (formerly AngelList)
  params.set("q", query);
  if (location) params.set("l", location);
  if (experience) params.set("experience", experience);
  if (hours) params.set("posted", `${Math.max(1, Math.ceil(hours / 24))}d`);
  params.set("sort", "recent");
  return `https://wellfound.com/jobs?${params.toString()}`;
}

type BookmarkletOptions = {
  token: string;
  apiBase: string;
  mode: "results" | "applied";
  savedSearchId?: string | null;
};

export function buildBookmarklet({ token, apiBase, mode, savedSearchId }: BookmarkletOptions) {
  const code = String.raw`(function(){
var TOKEN='__TOKEN__';
var API='__API__';
var MODE='__MODE__';
var SEARCH_ID='__SEARCH__';
function clean(v){return (v||'').replace(/\s+/g,' ').trim();}
function host(){return location.hostname.toLowerCase().replace(/^www\./,'');}
function source(){var h=host();if(h.indexOf('linkedin')>=0)return 'LINKEDIN';if(h.indexOf('naukri')>=0)return 'NAUKRI';if(h.indexOf('indeed')>=0)return 'INDEED';if(h.indexOf('instahyre')>=0)return 'INSTAHYRE';if(h.indexOf('cutshort')>=0)return 'CUTSHORT';if(h.indexOf('hirist')>=0)return 'HIRIST';if(h.indexOf('wellfound')>=0||h.indexOf('angellist')>=0)return 'WELLFOUND';return 'OTHER';}
function param(name){try{return new URLSearchParams(location.search).get(name)||'';}catch(e){return '';}}
function abs(u){if(!u)return '';try{return new URL(u,location.href).href;}catch(e){return '';}}
function txt(sel){var e=document.querySelector(sel);return e?clean(e.textContent):'';}
function attr(sel,name){var e=document.querySelector(sel);return e?(e.getAttribute(name)||''):'';}
function detectDate(value){var s=clean(value);if(!s)return null;var m=s.match(/(\d+)\s*(hours?|hrs?|h|days?|d|weeks?|w|months?|m|minutes?|mins?)/i);if(!m||!m[2])return null;var n=parseInt(m[1],10),u=m[2].toLowerCase(),mult=60000;if(/^(h|hour|hr)/.test(u))mult=3600000;else if(/^(d|day)/.test(u))mult=86400000;else if(/^(w|week)/.test(u))mult=604800000;else if(/month/.test(u))mult=2592000000;return new Date(Date.now()-n*mult).toISOString();}
function jsonLdJobs(){var out=[];var scripts=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<scripts.length;i++){try{var data=JSON.parse(scripts[i].textContent||'');var list=Array.isArray(data)?data:[data];for(var j=0;j<list.length;j++){var x=list[j];if(x&&(x['@type']==='JobPosting'||String(x['@type']||'').indexOf('JobPosting')>=0))out.push(x);}}catch(e){}}return out;}
function fromJsonLd(){var list=jsonLdJobs();if(!list.length)return null;var x=list[0],org=x.hiringOrganization||{},loc=x.jobLocation||{};return {url:abs(x.url||location.href),title:clean(x.title),company:clean(org.name),companyUrl:abs(org.url||org.sameAs),location:clean((loc.address&&loc.address.addressLocality)||loc.name),description:clean(x.description||'').slice(0,4000),postedAt:x.datePosted?new Date(x.datePosted).toISOString():null,employmentType:Array.isArray(x.employmentType)?String(x.employmentType[0]):String(x.employmentType||'')};}
function fromPage(){var ld=fromJsonLd();if(ld&&ld.title&&ld.company)return ld;var s=source(),title='',company='',location='',posted=null,description='';if(s==='LINKEDIN'){title=txt('h1')||attr('meta[property="og:title"]','content');company=txt('.top-card-layout__second-subline a')||txt('.job-details-jobs-unified-top-card__company-name')||txt('.base-search-card__subtitle');location=txt('.job-details-jobs-unified-top-card__primary-description')||txt('.base-search-card__metadata');posted=attr('time','datetime')||detectDate(txt('time'));description=txt('.show-more-less-html__markup').slice(0,4000);}else if(s==='NAUKRI'){title=txt('h1.job-title')||txt('h1')||txt('.title');company=txt('.companyName')||txt('.job-company-name');location=txt('.location')||txt('.job-location');posted=detectDate(txt('.posted-date')||txt('.posted'));description=txt('.job-desc').slice(0,4000);}else if(s==='INSTAHYRE'){title=txt('h1')||txt('.job-title');company=txt('.company-name')||txt('.company')||txt('[class*="company"]');location=txt('.location')||txt('.job-location');posted=detectDate(txt('[class*="posted"], .posted'));description=txt('.job-description, .description').slice(0,4000);}else if(s==='CUTSHORT'){title=txt('h1')||txt('.job-title');company=txt('.company-name')||txt('.org-name')||txt('[class*="company"]');location=txt('.location')||txt('[class*="location"]');posted=detectDate(txt('[class*="posted"], .time'));description=txt('.job-description, [class*="description"]').slice(0,4000);}else if(s==='HIRIST'){title=txt('h1')||txt('.job-title');company=txt('.company-name')||txt('.company');location=txt('.location');posted=detectDate(txt('.posted, [class*="posted"]'));description=txt('.job-desc, .description').slice(0,4000);}else if(s==='WELLFOUND'){title=txt('h1')||attr('meta[property="og:title"]','content');company=txt('[data-test="company-name"]')||txt('.company-name')||txt('a[href*="/company/"]');location=txt('[data-test="location"]')||txt('.location');posted=detectDate(txt('[data-test="posted"]')||txt('time'));description=txt('[data-test="job-description"]').slice(0,4000);}else{title=txt('h2.jobTitle')||txt('h1');company=txt('.companyName')||txt('[data-testid="company-name"]');location=txt('.companyLocation')||txt('.location');posted=detectDate(txt('.date')||txt('[data-testid="job-age"]'));description=txt('#jobDescriptionText').slice(0,4000);}return {url:abs(location.href),title:clean(title),company:clean(company),location:clean(location),description:clean(description),postedAt:posted,employmentType:''};}
function resultCards(){var s=source(),nodes=[],cards=[],seen={};if(s==='LINKEDIN')nodes=document.querySelectorAll('li.scaffold-layout__list-item, div.job-search-card, li[data-occludable-job-id]');else if(s==='NAUKRI')nodes=document.querySelectorAll('.jobTuple, .job-tuple, div[data-job-id]');else nodes=document.querySelectorAll('div.job_seen_beacon, div[data-jk], div.cardOutline, div.job-card, [class*="job-card"], [class*="jobCard"], [data-test="job-card"], article, li[data-job-id], .jobTuple, .job-tuple');for(var i=0;i<nodes.length;i++){var n=nodes[i];var a=n.querySelector('a[href*="jobs/view"], a[href*="job-detail"], a[data-jk], a[href*="/viewjob"], a[href*="/rc/clk"], a[href*="/job/"], a[href*="/jobs/"], a[href*="job-list"], a[href*="/opportunity/"]');var u=a?abs(a.getAttribute('href')):'';var title=clean((n.querySelector('.base-search-card__title, h2.jobTitle, h3.title, h3, .title, [class*="job-title"], [class*="jobTitle"]')||{}).textContent);var company=clean((n.querySelector('.base-search-card__subtitle, .companyName, .company-name, .company, [class*="company"]')||{}).textContent);var loc=clean((n.querySelector('.base-search-card__metadata, .jobMetaData, .location, [class*="location"]')||{}).textContent);var timeEl=n.querySelector('time');var posted=timeEl?(timeEl.getAttribute('datetime')||detectDate(timeEl.textContent)):detectDate((n.querySelector('.date, .posted, [class*="posted"]')||{}).textContent);if(!title||!company||!u||seen[u])continue;seen[u]=1;cards.push({url:u,title:title,company:company,location:loc,postedAt:posted,description:'',employmentType:''});}if(!cards.length){var one=fromPage();if(one.title&&one.company)cards.push(one);}return cards;}
function send(jobs){var payload={source:source(),kind:MODE==='applied'?'APPLIED':'SEARCH_RESULT',jobs:jobs,searchQuery:param('keywords')||param('q')||param('query'),searchLocation:param('location')||param('l')};if(SEARCH_ID)payload.savedSearchId=SEARCH_ID;fetch(API+'/api/jobs/ingest',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d};});}).then(function(x){if(x.ok){var d=x.data;alert('CareerOS: captured '+(d.created||0)+' new and '+(d.updated||0)+' updated job(s).');}else{alert('CareerOS error: '+(x.data.error||'Request failed'));}}).catch(function(e){alert('CareerOS could not reach the server: '+e.message);});}
var src=source();if(src==='OTHER'){alert('CareerOS bookmarklet works on LinkedIn, Naukri, Indeed, Instahyre, Cutshort, Hirist, and Wellfound.');return;}
if(MODE==='applied'){var job=fromPage();if(!job.title||!job.company){alert('CareerOS: open the job page first so I can read the details.');return;}job.appliedAt=new Date().toISOString();send([job]);}else{var jobs=resultCards();if(!jobs.length){alert('CareerOS: no job cards found. Run this on a search results page.');return;}send(jobs);}
})();`;

  return `javascript:${encodeURIComponent(
    code
      .replaceAll("__TOKEN__", token)
      .replaceAll("__API__", apiBase.replace(/\/$/, ""))
      .replaceAll("__MODE__", mode)
      .replaceAll("__SEARCH__", savedSearchId ?? ""),
  )}`;
}
