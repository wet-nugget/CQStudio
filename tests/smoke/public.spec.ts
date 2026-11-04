import { test, expect } from '@playwright/test';
test('unconfigured workspace is explicit and legal pages are reachable',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page).toHaveURL('/setup');
  await expect(page.getByRole('heading',{name:'Set up CQStudio'})).toBeVisible();
  await expect(page.getByText('Supabase is not configured. No live workspace data is displayed.')).toBeVisible();
  await page.getByRole('link',{name:'Privacy',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Privacy policy',exact:true})).toBeVisible();
  await expect(page.getByText(/Template, not legal advice|is responsible for this private workspace/)).toBeVisible();
  await page.getByRole('link',{name:'Browser storage',exact:true}).click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(errors).toEqual([]);
});
for(const path of ['/setup','/login','/privacy','/terms','/storage','/accept-invite']){
  test(`no serious accessibility violations on ${path}`,async({page})=>{
    await page.goto(path);await page.waitForLoadState('networkidle');
    await page.addScriptTag({url:'/__test/axe.js'});
    const violations=await page.evaluate(async()=>{
      const axe=(window as unknown as {axe:{run:()=>Promise<{violations:{id:string;impact:string;description:string}[]}>}}).axe;
      return(await axe.run()).violations.filter(item=>['serious','critical'].includes(item.impact));
    });
    expect(violations).toEqual([]);
  });
}
test('setup remains usable on a narrow screen and keyboard focus is visible',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/setup');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Tab');await expect(page.locator(':focus')).toHaveAttribute('href','/setup');
  await page.screenshot({path:'test-results/setup-mobile.png',fullPage:true});
});
test('HTML sandbox cannot read app storage, use the network, navigate top, or forge results',async({page,request})=>{
  await page.goto('/__test/sandbox');
  await expect(page.locator('#result')).toHaveText('3/3');
  await expect(page).toHaveURL('/__test/sandbox');
  expect(await page.evaluate(()=>localStorage.getItem('cq-probe'))).toBe('private-app-data');
  const response=await request.get('/__test/hits');expect(await response.json()).toEqual({hits:0});
});
