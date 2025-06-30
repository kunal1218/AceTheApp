import json
import time
import re
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    """Setup Chrome driver with appropriate options"""
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Add headless mode for debugging
    # chrome_options.add_argument("--headless")  # Uncomment to run headless
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    driver.implicitly_wait(10)
    return driver

def load_college_names():
    """Load college names from colleges.jsx file"""
    try:
        with open("../andrew_internship_work/src/colleges.jsx") as f:
            colleges_js = f.read()
        college_names = re.findall(r"name: ['\"]([^'\"]+)['\"]", colleges_js)
        return list(set(college_names))
    except FileNotFoundError:
        print("Error: Could not find colleges.jsx file. Using sample colleges.")
        return ["Harvard University", "Stanford University", "MIT"]

def try_direct_url(driver, college_name):
    """Navigate directly to the college's essay prompts page using the canonical CollegeVine URL pattern and only succeed if .card elements are found."""
    url_name = college_name.lower()
    url_name = url_name.replace('&', '-')  # Replace & with -
    url_name = re.sub(r'[^\w\s-]', '', url_name)
    url_name = re.sub(r'\s+', '-', url_name)
    url_name = re.sub(r'-+', '-', url_name)
    url_name = url_name.strip('-')
    url = f"https://www.collegevine.com/schools/{url_name}/essay-prompts"
    try:
        print(f"    Trying direct URL: {url}")
        driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(driver.page_source, "html.parser")
        cards = soup.select("div.card")
        if cards:
            print(f"    ✓ Direct URL worked and found {len(cards)} .card elements!")
            return True
        else:
            print(f"    Direct URL loaded but no .card elements found. Retrying once...")
            driver.refresh()
            time.sleep(3)
            soup = BeautifulSoup(driver.page_source, "html.parser")
            cards = soup.select("div.card")
            if cards:
                print(f"    ✓ Direct URL worked after reload and found {len(cards)} .card elements!")
                return True
            else:
                print(f"    Direct URL still has no .card elements after reload.")
    except Exception as e:
        print(f"    Direct URL failed: {e}")
    return False

def search_college(driver, college_name, wait):
    """Search for a college and navigate to its essay prompts page"""
    directory_url = "https://www.collegevine.com/college-essay-prompts"
    
    try:
        driver.get(directory_url)
        time.sleep(3)  # Let page fully load
        
        # Determine search term
        if ',' in college_name:
            search_term = college_name.split(',')[0].strip()
        elif '-' in college_name:
            search_term = college_name.split('-')[0].strip()
        else:
            search_term = college_name
        
        print(f"  Searching for: {college_name} (search term: {search_term})")
        
        # Try multiple search input selectors
        search_selectors = [
            "input[placeholder*='Search']",
            "input[placeholder*='school']",
            "input[type='search']",
            "input[class*='search']",
            ".search-input",
            "#search",
            "input"
        ]
        
        search_input = None
        for selector in search_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    if element.is_displayed() and element.is_enabled():
                        search_input = element
                        print(f"    Found search input with selector: {selector}")
                        break
                if search_input:
                    break
            except:
                continue
        
        if not search_input:
            print("  Could not find search input")
            return False
        
        # Scroll to the search input and make sure it's visible
        driver.execute_script("arguments[0].scrollIntoView(true);", search_input)
        time.sleep(1)
        
        # Try to click the search input first to focus it
        try:
            driver.execute_script("arguments[0].click();", search_input)
            time.sleep(0.5)
        except:
            pass
        
        # Clear and enter search term
        try:
            search_input.clear()
            time.sleep(0.5)
            search_input.send_keys(search_term)
            time.sleep(3)  # Wait longer for results
            
            # Try pressing Enter if dropdown doesn't appear
            search_input.send_keys(Keys.ENTER)
            time.sleep(2)
            
        except Exception as e:
            print(f"    Error interacting with search input: {e}")
            return False
        
        # Look for dropdown results or direct navigation
        dropdown_selectors = [
            "[data-testid='search-result']",
            ".search-result",
            ".dropdown-item",
            ".search-dropdown a",
            ".autocomplete-item",
            "a[href*='essay-prompts']"
        ]
        
        dropdown_results = []
        for selector in dropdown_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    dropdown_results = elements
                    print(f"    Found {len(elements)} results with selector: {selector}")
                    break
            except:
                continue
        
        if dropdown_results:
            # Click the first result
            try:
                driver.execute_script("arguments[0].click();", dropdown_results[0])
                time.sleep(3)
                return True
            except:
                try:
                    dropdown_results[0].click()
                    time.sleep(3)
                    return True
                except Exception as e:
                    print(f"    Error clicking dropdown result: {e}")
                    return False
        else:
            # Check if we're already on an essay prompts page
            current_url = driver.current_url
            if 'essay-prompts' in current_url and college_name.lower().replace(' ', '-') in current_url.lower():
                print("    Direct navigation successful")
                return True
            
            print(f"  No search results found for {college_name}")
            return False
            
    except Exception as e:
        print(f"  Error searching for {college_name}: {e}")
        return False

def scrape_essay_prompts(driver):
    """Scrape essay prompts from the current page"""
    try:
        # Wait a bit for the page to fully load
        time.sleep(3)
        
        soup = BeautifulSoup(driver.page_source, "html.parser")
        prompts = []
        
        # Try multiple selectors for essay prompt cards, but prioritize div.card (matches CollegeVine)
        card_selectors = [
            "div.card",  # CollegeVine's main card
            "div[class*='card']",  # fallback for card-like classes
            ".essay-prompt-card",
            ".prompt-card",
            "[class*='prompt']",
            ".prompt-container",
            ".essay-container"
        ]
        cards_found = False
        cards = []
        for selector in card_selectors:
            try:
                found_cards = soup.select(selector)
                if found_cards:
                    cards = found_cards
                    cards_found = True
                    print(f"    Found {len(cards)} cards using selector: {selector}")
                    break
            except Exception as e:
                print(f"    Selector error: {selector}: {e}")
                continue
        if not cards_found:
            print("    No .card elements found! Printing page snippet for debug:")
            print(soup.prettify()[:2000])
            return []
        
        # Extract prompts from cards
        for card in cards:
            card_text_parts = []
            word_count_text = None
            # Get card body or main content
            card_body = card.find(['div.card-body', '.card-content', '.prompt-content']) or card

            # Extract word count/limit text if present
            word_count_span = card_body.find('span', class_='text-secondary ml-2')
            if word_count_span:
                word_count_text = word_count_span.get_text(separator=' ', strip=True)

            # Extract headings
            for heading in card_body.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                heading_text = heading.get_text(strip=True)
                if heading_text and len(heading_text) > 3:
                    card_text_parts.append(heading_text)
            # Extract paragraphs
            for p in card_body.find_all('p'):
                p_text = p.get_text(strip=True)
                if p_text and len(p_text) > 10:
                    card_text_parts.append(p_text)
            # Extract list items
            for li in card_body.find_all('li'):
                li_text = li.get_text(strip=True)
                if li_text and len(li_text) > 10:
                    card_text_parts.append(li_text)
            # Look for option-based prompts
            for row in card_body.find_all(['div', 'section'], class_=re.compile(r'(row|option|choice)', re.I)):
                option_text = row.get_text(strip=True)
                if option_text and len(option_text) > 20:
                    card_text_parts.append(option_text)
            if card_text_parts:
                prompt_text = "\n".join(card_text_parts)
                # Only add if it looks like a substantial prompt
                if len(prompt_text) > 30:
                    prompt_obj = {"prompt": prompt_text}
                    if word_count_text:
                        prompt_obj["word_limit"] = word_count_text
                    prompts.append(prompt_obj)
        # Remove duplicates and clean up
        unique_prompts = []
        banned_phrases = [
            "We take every aspect of your personal profile into consideration when calculating your admissions chances.",
            "This school does not require essays or the essay prompts are not available yet.",
            "What will first-time readers think of your college essay?"
        ]
        remove_phrases = [
            "Read ouressay guideto get started.\nSubmit your essay for free peer review to refine and perfect it.",
            "Read ouressay guideto get started.",
            "Submit your essay for free peer review to refine and perfect it.",
            "Submit or review an essay"
        ]
        for prompt_obj in prompts:
            prompt = prompt_obj["prompt"]
            if not any(phrase in prompt for phrase in banned_phrases):
                cleaned = prompt
                for rphrase in remove_phrases:
                    cleaned = cleaned.replace(rphrase, "")
                cleaned = cleaned.strip()
                if len(cleaned) > 30 and not any(cleaned == up.get("prompt") for up in unique_prompts):
                    if "word_limit" in prompt_obj:
                        unique_prompts.append({"prompt": cleaned, "word_limit": prompt_obj["word_limit"]})
                    else:
                        unique_prompts.append({"prompt": cleaned})
        return unique_prompts
        
    except Exception as e:
        print(f"    Error scraping prompts: {e}")
        return []

def main():
    print("Starting CollegeVine essay prompt scraper...")
    
    # Load college names
    your_college_names = load_college_names()
    print(f"Loaded {len(your_college_names)} colleges")
    
    # Add debug mode - test with fewer colleges first
    DEBUG_MODE = False  # Set to True for debug mode
    if DEBUG_MODE:
        print("🔧 DEBUG MODE: Testing with first 5 colleges only")
        your_college_names = your_college_names[:5]
    
    # Setup driver
    driver = setup_driver()
    wait = WebDriverWait(driver, 15)  # Increased timeout
    
    year = "2025"
    essay_data = {}
    successful_scrapes = 0
    failed_direct_url_colleges = []
    try:
        for idx, college_name in enumerate(your_college_names):
            print(f"\n[{idx+1}/{len(your_college_names)}] Processing: {college_name}")
            
            # Try direct URL first
            if try_direct_url(driver, college_name):
                prompts = scrape_essay_prompts(driver)
                essay_data[college_name] = {year: prompts}
                if prompts:
                    print(f"  ✓ Found {len(prompts)} prompts via direct URL")
                    successful_scrapes += 1
                else:
                    print(f"  ⚠ No prompts found via direct URL")
                continue  # SKIP search fallback if direct URL worked
            else:
                failed_direct_url_colleges.append(college_name)
            
            # If direct URL failed, try search
            if search_college(driver, college_name, wait):
                prompts = scrape_essay_prompts(driver)
                essay_data[college_name] = {year: prompts}
                
                if prompts:
                    print(f"  ✓ Found {len(prompts)} prompts via search")
                    successful_scrapes += 1
                else:
                    print(f"  ⚠ No prompts found via search")
            else:
                essay_data[college_name] = {year: []}
                print(f"  ✗ Could not find college")
            
            # Small delay between requests
            time.sleep(2)
    
    except KeyboardInterrupt:
        print("\nScraping interrupted by user")
    
    finally:
        driver.quit()
    
    # Save results
    with open("essay_prompts.json", "w") as f:
        json.dump(essay_data, f, indent=2)
    
    print(f"\nScraping complete!")
    print(f"Successfully scraped {successful_scrapes}/{len(your_college_names)} colleges")
    print(f"Results saved to essay_prompts.json")
    
    # Print summary
    total_prompts = sum(len(data[year]) for data in essay_data.values())
    print(f"Total prompts collected: {total_prompts}")
    # Notify if any prompts contain the unwanted phrase
    unwanted_phrase = "Want the best free guidance app?"
    colleges_with_unwanted = []
    for college, data in essay_data.items():
        prompts = data.get(year, [])
        if any(unwanted_phrase in prompt for prompt in prompts):
            colleges_with_unwanted.append(college)
    if colleges_with_unwanted:
        print("\nThe following colleges have essay prompts containing the phrase 'Want the best free guidance app?':")
        for cname in colleges_with_unwanted:
            print(f"  - {cname}")
    else:
        print("\nNo colleges have essay prompts containing the phrase 'Want the best free guidance app?'")
    if failed_direct_url_colleges:
        print("\nThe following colleges did NOT work with the direct URL and required fallback search:")
        for cname in failed_direct_url_colleges:
            print(f"  - {cname}")
    else:
        print("\nAll colleges worked with the direct URL!")

if __name__ == "__main__":
    main()