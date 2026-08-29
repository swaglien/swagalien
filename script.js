const STORAGE_KEY = 'nutrition-tracker-data';
const GOALS_KEY = 'nutrition-tracker-goals';
const PROFILE_KEY = 'nutrition-tracker-profile';
const DAY_MS = 24 * 60 * 60 * 1000;
const isDesktopApp = new URLSearchParams(window.location.search).has('desktop');
const profileStorageKey = isDesktopApp ? `${PROFILE_KEY}-desktop` : PROFILE_KEY;
const goalsStorageKey = isDesktopApp ? `${GOALS_KEY}-desktop` : GOALS_KEY;

function formatDateKey(dateValue = new Date()) {
  const date = new Date(dateValue);
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return normalized.toISOString().slice(0, 10);
}

function normalizeMeal(meal) {
  const items = Array.isArray(meal.items) ? meal.items : [meal];
  const totals = items.reduce(
    (acc, item) => {
      acc.calories += Number(item.calories || 0);
      acc.protein += Number(item.protein || 0);
      acc.carbs += Number(item.carbs || 0);
      acc.fat += Number(item.fat || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    id: meal.id || crypto.randomUUID(),
    name: meal.name || 'Meal',
    date: meal.date || formatDateKey(),
    items: items.map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name || 'Food',
      calories: Number(item.calories || 0),
      protein: Number(item.protein || 0),
      carbs: Number(item.carbs || 0),
      fat: Number(item.fat || 0),
    })),
    calories: totals.calories || Number(meal.calories || 0),
    protein: totals.protein || Number(meal.protein || 0),
    carbs: totals.carbs || Number(meal.carbs || 0),
    fat: totals.fat || Number(meal.fat || 0),
  };
}

const defaultProfile = {
  name: '',
  age: isDesktopApp ? 0 : 28,
  weight: isDesktopApp ? 0 : 75,
  height: isDesktopApp ? 0 : 178,
  goal: isDesktopApp ? 'maintain' : 'lean-bulk',
  units: 'metric',
};

const defaultGoals = {
  calories: isDesktopApp ? 0 : 2200,
  protein: isDesktopApp ? 0 : 160,
  carbs: isDesktopApp ? 0 : 250,
  fat: isDesktopApp ? 0 : 70,
};

function kgToLb(value) {
  return value * 2.20462;
}

function cmToIn(value) {
  return value / 2.54;
}

function lbToKg(value) {
  return value / 2.20462;
}

function inToCm(value) {
  return value * 2.54;
}

function getBmi(weightKg, heightCm) {
  const heightM = heightCm / 100;
  if (!heightM || heightM <= 0) return 0;
  return weightKg / (heightM * heightM);
}

function getBmiStatus(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', description: 'You are a little below the healthy range. Focus on nutrient-dense meals and recovery.' };
  if (bmi < 25) return { label: 'Healthy', description: 'Your body weight is currently in the healthy range.' };
  if (bmi < 30) return { label: 'Overweight', description: 'You are above the healthy range. A moderate calorie deficit and consistent training could help.' };
  return { label: 'Obese', description: 'Your BMI is in the higher range. A structured calorie deficit and strength-focused routine can help.' };
}

function getRecommendedGoals(profile, goalOverride) {
  const goal = goalOverride || profile.goal || 'lean-bulk';
  const weight = Number(profile.weight || (isDesktopApp ? 0 : 75));
  const height = Number(profile.height || (isDesktopApp ? 0 : 178));
  const age = Number(profile.age || (isDesktopApp ? 0 : 28));

  if (isDesktopApp && (!weight || !height || !age)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const metricWeight = profile.units === 'imperial' ? lbToKg(weight) : weight;
  const metricHeight = profile.units === 'imperial' ? inToCm(height) : height;

  const maintenanceCalories = 10 * metricWeight + 6.25 * metricHeight - 5 * age + 5;

  let adjustment = 0;
  if (goal === 'maintain') adjustment = 0;
  if (goal === 'cut') adjustment = -400;
  if (goal === 'lean-bulk') adjustment = 220;
  if (goal === 'performance') adjustment = 350;
  if (goal === 'protein-focus') adjustment = 120;
  if (goal === 'custom') adjustment = 0;

  const calories = Math.round(maintenanceCalories + adjustment);
  const protein = Math.round(metricWeight * 2.2 + (goal === 'protein-focus' ? 25 : 0));
  const fat = Math.round(metricWeight * 0.7 + (goal === 'performance' ? 10 : goal === 'cut' ? 2 : goal === 'lean-bulk' ? 5 : 0));
  const carbs = Math.max(0, Math.round((calories - (protein * 4 + fat * 9)) / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
  };
}

const state = {
  meals: (JSON.parse(localStorage.getItem(isDesktopApp ? `${STORAGE_KEY}-desktop` : STORAGE_KEY) || '[]')).map(normalizeMeal),
  goals: JSON.parse(localStorage.getItem(goalsStorageKey) || JSON.stringify(defaultGoals)),
  profile: JSON.parse(localStorage.getItem(profileStorageKey) || JSON.stringify(defaultProfile)),
};

const calorieTotalEl = document.querySelector('#calories-total');
const proteinTotalEl = document.querySelector('#protein-total');
const carbsTotalEl = document.querySelector('#carbs-total');
const fatTotalEl = document.querySelector('#fat-total');

const caloriesGoalEl = document.querySelector('#calories-goal');
const proteinGoalEl = document.querySelector('#protein-goal');
const carbsGoalEl = document.querySelector('#carbs-goal');
const fatGoalEl = document.querySelector('#fat-goal');

const caloriesProgressEl = document.querySelector('#calories-progress');
const proteinProgressEl = document.querySelector('#protein-progress');
const carbsProgressEl = document.querySelector('#carbs-progress');
const fatProgressEl = document.querySelector('#fat-progress');

const foodListEl = document.querySelector('#food-list');
const foodForm = document.querySelector('#food-form');
const goalsForm = document.querySelector('#goals-form');
const profileForm = document.querySelector('#profile-form');
const quickLogForm = document.querySelector('#quick-log-form');
const clearButton = document.querySelector('#clear-data');
const addMealItemButton = document.querySelector('#add-meal-item');
const mealItemsContainer = document.querySelector('#meal-items');

const recommendedSummaryEl = document.querySelector('#recommended-summary');
const recommendedCaloriesEl = document.querySelector('#recommended-calories');
const recommendedProteinEl = document.querySelector('#recommended-protein');
const recommendedCarbsEl = document.querySelector('#recommended-carbs');
const recommendedFatEl = document.querySelector('#recommended-fat');

const todayCaloriesEl = document.querySelector('#today-calories');
const todayProteinEl = document.querySelector('#today-protein');
const todayCarbsEl = document.querySelector('#today-carbs');
const todayFatEl = document.querySelector('#today-fat');

const bmiLabelEl = document.querySelector('#bmi-label');
const bmiMarkerEl = document.querySelector('#bmi-marker');
const bmiSummaryEl = document.querySelector('#bmi-summary');
const heightSingleInputEl = document.querySelector('#account-height');
const desktopHeightFieldsEl = document.querySelector('#desktop-height-fields');
const heightFeetEl = document.querySelector('#account-height-feet');
const heightInchesEl = document.querySelector('#account-height-inches');
const recipeInputEl = document.querySelector('#recipe-input');
const recipeFileEl = document.querySelector('#recipe-file');
const recipeSummaryEl = document.querySelector('#recipe-summary');
const parseRecipeButton = document.querySelector('#parse-recipe');
const scanRecipeButton = document.querySelector('#scan-recipe');
const ocrStatusEl = document.querySelector('#ocr-status');
const addRecipeMealButton = document.querySelector('#add-recipe-meal');
const weeklyTrendEl = document.querySelector('#weekly-trend');
const authForm = document.querySelector('#auth-form');
const authSignupButton = document.querySelector('#auth-signup');
const authSignedOutEl = document.querySelector('#auth-signed-out');
const authSignedInEl = document.querySelector('#auth-signed-in');
const authEmailEl = document.querySelector('#auth-email');
const authPasswordEl = document.querySelector('#auth-password');
const authSubmitEl = document.querySelector('#auth-submit');
const authUserEmailEl = document.querySelector('#auth-user-email');
const authMessageEl = document.querySelector('#auth-message');
const authSignoutButton = document.querySelector('#auth-signout');
const syncNowButton = document.querySelector('#sync-now');
const syncStatusEl = document.querySelector('#sync-status');
const updateMessageEl = document.querySelector('#update-message');

let parsedRecipe = null;
let authSession = JSON.parse(localStorage.getItem('nutrition-tracker-session') || 'null');

if (window.desktopUpdates) {
  window.desktopUpdates.onStatusChange((message) => {
    updateMessageEl.textContent = message;
  });
}
let isPullingFromCloud = false;

function setAuthMessage(message) {
  authMessageEl.textContent = message;
}

function setSyncStatus(message, statusClass = '') {
  syncStatusEl.textContent = message;
  syncStatusEl.className = `sync-status ${statusClass}`;
}

async function supabaseRequest(path, options = {}) {
  const headers = {
    apikey: window.SUPABASE_CONFIG.publishableKey,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authSession?.access_token) {
    headers.Authorization = `Bearer ${authSession.access_token}`;
  }

  const response = await fetch(`${window.SUPABASE_CONFIG.url}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.msg || errorBody.message || `Request failed (${response.status})`);
  }

  return response.status === 204 ? null : response.json();
}

async function authenticate(endpoint, email, password) {
  const result = await supabaseRequest(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!result.access_token) {
    throw new Error('Check your email to confirm your account, then sign in.');
  }

  authSession = result;
  localStorage.setItem('nutrition-tracker-session', JSON.stringify(result));
}

function setAuthenticatedUI() {
  const isSignedIn = Boolean(authSession?.access_token);
  authSignedOutEl.hidden = isSignedIn;
  authSignedInEl.hidden = !isSignedIn;
  authUserEmailEl.textContent = authSession?.user?.email || '';
  if (!isSignedIn) setSyncStatus('Local only');
}

async function syncToCloud() {
  if (!authSession?.access_token) return;

  setSyncStatus('Syncing...', 'is-syncing');
  const userId = authSession.user.id;

  await supabaseRequest('/rest/v1/profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      name: state.profile.name || '',
      age: Number(state.profile.age || 0),
      weight_kg: state.profile.units === 'imperial' ? Number(lbToKg(state.profile.weight || 0).toFixed(2)) : Number(state.profile.weight || 0),
      height_cm: state.profile.units === 'imperial' ? Number(inToCm(state.profile.height || 0).toFixed(2)) : Number(state.profile.height || 0),
      goal: state.profile.goal || 'maintain',
      units: state.profile.units || 'metric',
    }),
  });

  await supabaseRequest('/rest/v1/goals?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, ...state.goals }),
  });

  for (const meal of state.meals) {
    await supabaseRequest('/rest/v1/meals?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: meal.id,
        user_id: userId,
        name: meal.name || 'Meal',
        meal_date: meal.date || formatDateKey(),
        calories: Number(meal.calories || 0),
        protein: Number(meal.protein || 0),
        carbs: Number(meal.carbs || 0),
        fat: Number(meal.fat || 0),
      }),
    });

    await supabaseRequest('/rest/v1/meal_items?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: meal.items.map((item) => ({
        id: item.id || crypto.randomUUID(),
        meal_id: meal.id,
        user_id: userId,
        name: item.name || 'Food',
        calories: Number(item.calories || 0),
        protein: Number(item.protein || 0),
        carbs: Number(item.carbs || 0),
        fat: Number(item.fat || 0),
      })),
    });
  }

  setSyncStatus('Synced', 'is-synced');
}

async function pullFromCloud() {
  if (!authSession?.access_token) return;

  setSyncStatus('Syncing...', 'is-syncing');
  const userId = authSession.user.id;
  const [profiles, goals, meals, items] = await Promise.all([
    supabaseRequest(`/rest/v1/profiles?user_id=eq.${userId}&select=*`),
    supabaseRequest(`/rest/v1/goals?user_id=eq.${userId}&select=*`),
    supabaseRequest(`/rest/v1/meals?user_id=eq.${userId}&deleted_at=is.null&select=*`),
    supabaseRequest(`/rest/v1/meal_items?user_id=eq.${userId}&deleted_at=is.null&select=*`),
  ]);

  isPullingFromCloud = true;
  try {
    state.profile = profiles[0]
      ? {
        name: profiles[0].name || '',
        age: Number(profiles[0].age || 0),
        weight: profiles[0].units === 'imperial' ? Number(kgToLb(profiles[0].weight_kg || 0).toFixed(1)) : Number(profiles[0].weight_kg || 0),
        height: profiles[0].units === 'imperial' ? Number(cmToIn(profiles[0].height_cm || 0).toFixed(1)) : Number(profiles[0].height_cm || 0),
        goal: profiles[0].goal || 'maintain',
        units: profiles[0].units || 'metric',
      }
      : { ...defaultProfile };
    state.goals = goals[0]
      ? {
        calories: Number(goals[0].calories || 0),
        protein: Number(goals[0].protein || 0),
        carbs: Number(goals[0].carbs || 0),
        fat: Number(goals[0].fat || 0),
      }
      : { ...defaultGoals };
    state.meals = meals.map((meal) => normalizeMeal({
      ...meal,
      date: meal.meal_date,
      items: items.filter((item) => item.meal_id === meal.id).map((item) => ({
        id: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    }));
    localStorage.setItem(profileStorageKey, JSON.stringify(state.profile));
    localStorage.setItem(goalsStorageKey, JSON.stringify(state.goals));
    localStorage.setItem(isDesktopApp ? `${STORAGE_KEY}-desktop` : STORAGE_KEY, JSON.stringify(state.meals));
  } finally {
    isPullingFromCloud = false;
  }

  setSyncStatus('Synced', 'is-synced');
}

function queueSync() {
  if (authSession?.access_token) {
    syncToCloud().catch((error) => setSyncStatus(`Sync error: ${error.message}`));
  }
}

function clearLocalDataForNewAccount() {
  state.profile = { ...defaultProfile };
  state.goals = { ...defaultGoals };
  state.meals = [];
  localStorage.setItem(profileStorageKey, JSON.stringify(state.profile));
  localStorage.setItem(goalsStorageKey, JSON.stringify(state.goals));
  localStorage.setItem(isDesktopApp ? `${STORAGE_KEY}-desktop` : STORAGE_KEY, JSON.stringify(state.meals));
}

function extractMacroValue(text, keywords) {
  const pattern = new RegExp(`(?:${keywords.join('|')})\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:g|grams?|kcal|cal|cals)?`, 'i');
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}

function parseRecipeText(rawText) {
  const text = String(rawText || '').toLowerCase();

  const calories = extractMacroValue(text, ['calories', 'cals', 'kcal', 'energy']) || extractMacroValue(text, ['calories?\\s*from\\s*fat']) || 0;
  const protein = extractMacroValue(text, ['protein', 'prot']) || 0;
  const carbs = extractMacroValue(text, ['carbs', 'carbohydrate', 'carbohydrates', 'carb', 'total\\s*carbohydrate']) || 0;
  const fat = extractMacroValue(text, ['fat', 'total fat', 'total\\s*fat']) || 0;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

function applyRecipeToForm(recipeData, title) {
  parsedRecipe = {
    name: (title || 'Recipe').trim() || 'Recipe',
    ...recipeData,
  };

  document.querySelector('#quick-log-name').value = parsedRecipe.name;
  document.querySelector('#quick-log-calories').value = parsedRecipe.calories || 0;
  document.querySelector('#quick-log-protein').value = parsedRecipe.protein || 0;
  document.querySelector('#quick-log-carbs').value = parsedRecipe.carbs || 0;
  document.querySelector('#quick-log-fat').value = parsedRecipe.fat || 0;

  recipeSummaryEl.innerHTML = `<strong>${parsedRecipe.name}</strong><br/>${parsedRecipe.calories} kcal, ${parsedRecipe.protein}g protein, ${parsedRecipe.carbs}g carbs, ${parsedRecipe.fat}g fat.`;
}

function getWeeklyTrendData() {
  const today = new Date();
  const results = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * DAY_MS);
    const key = formatDateKey(date);

    const total = state.meals
      .filter((meal) => String(meal.date || formatDateKey()).slice(0, 10) === key)
      .reduce(
        (sum, meal) => {
          sum.calories += Number(meal.calories || 0);
          sum.protein += Number(meal.protein || 0);
          sum.carbs += Number(meal.carbs || 0);
          sum.fat += Number(meal.fat || 0);
          return sum;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

    results.push({
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      shortDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      calories: total.calories,
    });
  }

  return results;
}

function renderWeeklyTrend() {
  const trendData = getWeeklyTrendData();
  const peak = Math.max(...trendData.map((day) => day.calories), 1);

  weeklyTrendEl.innerHTML = trendData
    .map(
      (day) => `
        <div class="trend-day">
          <div class="trend-bar-wrap">
            <div class="trend-bar" style="height:${Math.max((day.calories / peak) * 100, 8)}%"></div>
          </div>
          <strong>${day.label}</strong>
          <span>${day.shortDate}</span>
        </div>
      `
    )
    .join('');
}

let mealItems = [createMealItem()];

function createMealItem() {
  return {
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

function saveMeals() {
  localStorage.setItem(isDesktopApp ? `${STORAGE_KEY}-desktop` : STORAGE_KEY, JSON.stringify(state.meals));
  if (!isPullingFromCloud) queueSync();
}

function saveGoals() {
  localStorage.setItem(goalsStorageKey, JSON.stringify(state.goals));
  if (!isPullingFromCloud) queueSync();
}

function saveProfile() {
  localStorage.setItem(profileStorageKey, JSON.stringify(state.profile));
  if (!isPullingFromCloud) queueSync();
}

function calculateTotals() {
  return state.meals.reduce(
    (totals, meal) => {
      const items = Array.isArray(meal.items) ? meal.items : [];

      if (!items.length) {
        totals.calories += Number(meal.calories || 0);
        totals.protein += Number(meal.protein || 0);
        totals.carbs += Number(meal.carbs || 0);
        totals.fat += Number(meal.fat || 0);
        return totals;
      }

      items.forEach((item) => {
        totals.calories += Number(item.calories || 0);
        totals.protein += Number(item.protein || 0);
        totals.carbs += Number(item.carbs || 0);
        totals.fat += Number(item.fat || 0);
      });

      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function getProgress(value, max) {
  if (!max) return 0;
  return Math.min((value / max) * 100, 100);
}

function renderGoalInputs() {
  document.querySelector('#goal-calories').value = state.goals.calories;
  document.querySelector('#goal-protein').value = state.goals.protein;
  document.querySelector('#goal-carbs').value = state.goals.carbs;
  document.querySelector('#goal-fat').value = state.goals.fat;
}

function renderProfileInputs() {
  const units = state.profile.units || 'metric';
  document.querySelector('#account-name').value = state.profile.name || '';
  document.querySelector('#account-age').value = state.profile.age || (isDesktopApp ? 0 : 28);
  document.querySelector('#account-units').value = units;
  document.querySelector('#account-weight').value = state.profile.weight || (isDesktopApp ? 0 : units === 'imperial' ? 165 : 75);
  document.querySelector('#account-height').value = state.profile.height || (isDesktopApp ? 0 : units === 'imperial' ? 70 : 178);
  document.querySelector('#account-goal').value = state.profile.goal || 'lean-bulk';
  updateWeightHeightLabels();
}

function updateWeightHeightLabels() {
  const units = document.querySelector('#account-units').value;
  const weightLabel = document.querySelector('#account-weight').closest('label');
  const heightLabel = document.querySelector('#account-height').closest('label');

  weightLabel.firstChild.textContent = units === 'imperial' ? 'Weight (lb)' : 'Weight (kg)';
  heightLabel.firstChild.textContent = isDesktopApp && units === 'imperial' ? 'Height (ft and in)' : units === 'imperial' ? 'Height (in)' : 'Height (cm)';

  if (!isDesktopApp) return;

  const useImperialFields = units === 'imperial';
  heightSingleInputEl.style.display = useImperialFields ? 'none' : 'block';
  desktopHeightFieldsEl.style.display = useImperialFields ? 'grid' : 'none';

  if (useImperialFields) {
    const totalInches = Number(document.querySelector('#account-height').value || 0);
    heightFeetEl.value = totalInches ? Math.floor(totalInches / 12) : 0;
    heightInchesEl.value = totalInches ? Number((totalInches % 12).toFixed(1)) : 0;
  }
}

function renderBodyStatus() {
  const units = state.profile.units || 'metric';
  const weight = Number(state.profile.weight || 75);
  const height = Number(state.profile.height || 178);

  const weightKg = units === 'imperial' ? lbToKg(weight) : weight;
  const heightCm = units === 'imperial' ? inToCm(height) : height;
  const bmi = getBmi(weightKg, heightCm);
  const status = getBmiStatus(bmi);

  bmiLabelEl.textContent = status.label;
  bmiSummaryEl.textContent = status.description;

  const minValue = 15;
  const maxValue = 35;
  const normalized = Math.min(Math.max((bmi - minValue) / (maxValue - minValue), 0), 1);
  bmiMarkerEl.style.left = `${normalized * 100}%`;
}

function renderRecommendedSummary() {
  const recommended = getRecommendedGoals(state.profile, state.profile.goal || 'lean-bulk');
  const goalLabel = {
    maintain: 'Maintain target',
    cut: 'Cut target',
    'lean-bulk': 'Lean bulk target',
    performance: 'Performance target',
    'protein-focus': 'Protein focus target',
    custom: 'Custom target',
  }[state.profile.goal || 'lean-bulk'];

  recommendedSummaryEl.textContent = goalLabel;
  recommendedCaloriesEl.textContent = `${recommended.calories}`;
  recommendedProteinEl.textContent = `${recommended.protein}g`;
  recommendedCarbsEl.textContent = `${recommended.carbs}g`;
  recommendedFatEl.textContent = `${recommended.fat}g`;
}

function renderSummary() {
  const totals = calculateTotals();
  const goals = state.goals;

  calorieTotalEl.textContent = totals.calories;
  proteinTotalEl.textContent = totals.protein;
  carbsTotalEl.textContent = totals.carbs;
  fatTotalEl.textContent = totals.fat;

  caloriesGoalEl.textContent = `/ ${goals.calories}`;
  proteinGoalEl.textContent = `/ ${goals.protein}g`;
  carbsGoalEl.textContent = `/ ${goals.carbs}g`;
  fatGoalEl.textContent = `/ ${goals.fat}g`;

  caloriesProgressEl.style.width = `${getProgress(totals.calories, goals.calories)}%`;
  proteinProgressEl.style.width = `${getProgress(totals.protein, goals.protein)}%`;
  carbsProgressEl.style.width = `${getProgress(totals.carbs, goals.carbs)}%`;
  fatProgressEl.style.width = `${getProgress(totals.fat, goals.fat)}%`;

  todayCaloriesEl.textContent = `${totals.calories} / ${goals.calories}`;
  todayProteinEl.textContent = `${totals.protein} / ${goals.protein}g`;
  todayCarbsEl.textContent = `${totals.carbs} / ${goals.carbs}g`;
  todayFatEl.textContent = `${totals.fat} / ${goals.fat}g`;
}

function renderMealItems() {
  if (!mealItems.length) {
    mealItems = [createMealItem()];
  }

  mealItemsContainer.innerHTML = mealItems
    .map(
      (item, index) => `
        <div class="meal-item-row">
          <div class="meal-item-field meal-item-name">
            <label>
              Food
              <input type="text" data-index="${index}" data-field="name" value="${(item.name || '').replace(/"/g, '&quot;')}" placeholder="Chicken breast" />
            </label>
          </div>
          <div class="meal-item-field">
            <label>
              Calories
              <input type="number" data-index="${index}" data-field="calories" min="0" value="${item.calories}" />
            </label>
          </div>
          <div class="meal-item-field">
            <label>
              Protein
              <input type="number" data-index="${index}" data-field="protein" min="0" value="${item.protein}" />
            </label>
          </div>
          <div class="meal-item-field">
            <label>
              Carbs
              <input type="number" data-index="${index}" data-field="carbs" min="0" value="${item.carbs}" />
            </label>
          </div>
          <div class="meal-item-field">
            <label>
              Fat
              <input type="number" data-index="${index}" data-field="fat" min="0" value="${item.fat}" />
            </label>
          </div>
          <button type="button" class="remove-meal-item" data-index="${index}">Delete</button>
        </div>
      `
    )
    .join('');
}

function renderMeals() {
  if (!state.meals.length) {
    foodListEl.innerHTML = '<li class="empty-state">No meals logged yet. Add your first meal with multiple foods above.</li>';
    return;
  }

  foodListEl.innerHTML = state.meals
    .map(
      (meal, index) => {
        const itemNames = (meal.items || [meal]).map((item) => item.name || 'Food').join(', ');
        return `
          <li class="food-item meal-summary-card">
            <div class="meal-name-wrap">
              <strong>${meal.name || 'Meal'}</strong>
              <small>${itemNames}</small>
            </div>
            <div>
              <span>Calories</span><br />
              ${meal.calories}
            </div>
            <div>
              <span>Protein</span><br />
              ${meal.protein}g
            </div>
            <div>
              <span>Carbs</span><br />
              ${meal.carbs}g
            </div>
            <div>
              <span>Fat</span><br />
              ${meal.fat}g
            </div>
            <button class="delete-button" data-index="${index}" type="button">Delete</button>
          </li>
        `;
      }
    )
    .join('');
}

function refreshMealItemDataFromInputs() {
  mealItems = mealItems.map((item, index) => {
    const row = mealItemsContainer.querySelector(`[data-index="${index}"]`);
    if (!row) return item;

    return {
      name: mealItemsContainer.querySelector(`[data-index="${index}"][data-field="name"]`)?.value || item.name,
      calories: Number(mealItemsContainer.querySelector(`[data-index="${index}"][data-field="calories"]`)?.value || 0),
      protein: Number(mealItemsContainer.querySelector(`[data-index="${index}"][data-field="protein"]`)?.value || 0),
      carbs: Number(mealItemsContainer.querySelector(`[data-index="${index}"][data-field="carbs"]`)?.value || 0),
      fat: Number(mealItemsContainer.querySelector(`[data-index="${index}"][data-field="fat"]`)?.value || 0),
    };
  });
}

function render() {
  renderSummary();
  renderMeals();
  renderWeeklyTrend();
}

function readRecipeText(contents, fileName) {
  const recipeData = parseRecipeText(contents);

  if (!recipeData.calories && !recipeData.protein && !recipeData.carbs && !recipeData.fat) {
    recipeSummaryEl.textContent = 'No clear calorie/protein/carbs/fat numbers were found. Try pasting a Nutrition Facts block or a recipe with macros listed.';
    parsedRecipe = null;
    return;
  }

  const recipeTitle = fileName ? fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() : 'Recipe';
  applyRecipeToForm(recipeData, recipeTitle);
}

function addMealItemRow() {
  mealItems.push(createMealItem());
  renderMealItems();
}

function saveProfileForm() {
  const units = document.querySelector('#account-units').value;
  const rawWeight = Number(document.querySelector('#account-weight').value || (isDesktopApp ? 0 : units === 'imperial' ? 165 : 75));
  const rawHeight = isDesktopApp && units === 'imperial'
    ? Number(heightFeetEl.value || 0) * 12 + Number(heightInchesEl.value || 0)
    : Number(document.querySelector('#account-height').value || (isDesktopApp ? 0 : units === 'imperial' ? 70 : 178));

  const weightValue = units === 'imperial' ? Number((rawWeight).toFixed(1)) : Number((rawWeight).toFixed(1));
  const heightValue = units === 'imperial' ? Number((rawHeight).toFixed(1)) : Number((rawHeight).toFixed(1));

  state.profile = {
    name: document.querySelector('#account-name').value.trim(),
    age: Number(document.querySelector('#account-age').value || 28),
    weight: weightValue,
    height: heightValue,
    goal: document.querySelector('#account-goal').value,
    units,
  };

  saveProfile();
}

foodForm.addEventListener('submit', (event) => {
  event.preventDefault();

  refreshMealItemDataFromInputs();

  const validItems = mealItems.filter((item) => item.name && (item.calories || item.protein || item.carbs || item.fat));

  if (!validItems.length) {
    return;
  }

  const meal = {
    name: document.querySelector('#meal-name').value.trim() || 'Meal',
    date: formatDateKey(),
    items: validItems,
    calories: validItems.reduce((sum, item) => sum + Number(item.calories || 0), 0),
    protein: validItems.reduce((sum, item) => sum + Number(item.protein || 0), 0),
    carbs: validItems.reduce((sum, item) => sum + Number(item.carbs || 0), 0),
    fat: validItems.reduce((sum, item) => sum + Number(item.fat || 0), 0),
  };

  state.meals.unshift(meal);
  saveMeals();
  render();

  mealItems = [createMealItem()];
  foodForm.reset();
  renderMealItems();
  document.querySelector('#meal-name').focus();
});

parseRecipeButton.addEventListener('click', () => {
  const text = recipeInputEl.value.trim();
  if (!text) {
    recipeSummaryEl.textContent = 'Paste a recipe or nutrition facts before parsing.';
    return;
  }

  readRecipeText(text, 'Recipe');
});

addRecipeMealButton.addEventListener('click', () => {
  if (!parsedRecipe) {
    recipeSummaryEl.textContent = 'Parse a recipe first so there is something to add.';
    return;
  }

  const recipeMeal = {
    name: parsedRecipe.name || 'Recipe',
    date: formatDateKey(),
    items: [
      {
        name: parsedRecipe.name || 'Recipe',
        calories: Number(parsedRecipe.calories || 0),
        protein: Number(parsedRecipe.protein || 0),
        carbs: Number(parsedRecipe.carbs || 0),
        fat: Number(parsedRecipe.fat || 0),
      },
    ],
    calories: Number(parsedRecipe.calories || 0),
    protein: Number(parsedRecipe.protein || 0),
    carbs: Number(parsedRecipe.carbs || 0),
    fat: Number(parsedRecipe.fat || 0),
  };

  state.meals.unshift(recipeMeal);
  saveMeals();
  render();
  recipeInputEl.value = '';
  recipeFileEl.value = '';
  parsedRecipe = null;
  recipeSummaryEl.textContent = 'Added recipe to today\'s log.';
});

recipeFileEl.addEventListener('change', async (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const text = await file.text();
  if (file.type.startsWith('image/')) {
    recipeInputEl.value = '';
    ocrStatusEl.textContent = 'Photo ready. Click Scan photo to read it.';
    return;
  }

  recipeInputEl.value = text.slice(0, 4000);
  readRecipeText(text, file.name);
});

scanRecipeButton.addEventListener('click', async () => {
  const file = recipeFileEl.files && recipeFileEl.files[0];
  if (!file || !file.type.startsWith('image/')) {
    ocrStatusEl.textContent = 'Choose a nutrition-label photo first.';
    return;
  }

  if (!window.Tesseract) {
    ocrStatusEl.textContent = 'Photo scanning is unavailable while offline. Connect to the internet and try again.';
    return;
  }

  scanRecipeButton.disabled = true;
  ocrStatusEl.textContent = 'Reading photo...';

  try {
    const result = await window.Tesseract.recognize(file, 'eng', {
      logger: (message) => {
        if (message.status === 'recognizing text' && message.progress) {
          ocrStatusEl.textContent = `Reading photo... ${Math.round(message.progress * 100)}%`;
        }
      },
    });

    recipeInputEl.value = result.data.text.trim();
    readRecipeText(result.data.text, file.name);
    ocrStatusEl.textContent = 'Photo text extracted. Check the numbers, then add the recipe.';
  } catch (error) {
    ocrStatusEl.textContent = 'Could not read that photo. Try a brighter, closer image of the nutrition label.';
  } finally {
    scanRecipeButton.disabled = false;
  }
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  authSubmitEl.disabled = true;
  setAuthMessage('Signing in...');

  try {
    await authenticate('/auth/v1/token?grant_type=password', authEmailEl.value.trim(), authPasswordEl.value);
    setAuthenticatedUI();
    setAuthMessage('');
    await pullFromCloud();
    renderProfileInputs();
    renderGoalInputs();
    renderRecommendedSummary();
    renderBodyStatus();
    render();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    authSubmitEl.disabled = false;
  }
});

authSignupButton.addEventListener('click', async () => {
  if (!authEmailEl.value.trim() || !authPasswordEl.value) {
    setAuthMessage('Enter an email and password first.');
    return;
  }

  authSignupButton.disabled = true;
  setAuthMessage('Creating account...');

  try {
    await authenticate('/auth/v1/signup', authEmailEl.value.trim(), authPasswordEl.value);
    setAuthenticatedUI();
    setAuthMessage('Account created.');
    clearLocalDataForNewAccount();
    renderProfileInputs();
    renderGoalInputs();
    renderRecommendedSummary();
    renderBodyStatus();
    render();
    await syncToCloud();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    authSignupButton.disabled = false;
  }
});

authSignoutButton.addEventListener('click', async () => {
  try {
    await supabaseRequest('/auth/v1/logout', { method: 'POST' });
  } catch (error) {
    setAuthMessage(error.message);
  }

  authSession = null;
  localStorage.removeItem('nutrition-tracker-session');
  setAuthenticatedUI();
  setAuthMessage('Signed out. Local data remains on this device.');
});

syncNowButton.addEventListener('click', async () => {
  try {
    await pullFromCloud();
    renderProfileInputs();
    renderGoalInputs();
    renderRecommendedSummary();
    renderBodyStatus();
    render();
  } catch (error) {
    setSyncStatus(`Sync error: ${error.message}`);
  }
});

quickLogForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const quickMeal = {
    name: document.querySelector('#quick-log-name').value.trim() || 'Quick log',
    date: formatDateKey(),
    items: [
      {
        name: document.querySelector('#quick-log-name').value.trim() || 'Quick log',
        calories: Number(document.querySelector('#quick-log-calories').value || 0),
        protein: Number(document.querySelector('#quick-log-protein').value || 0),
        carbs: Number(document.querySelector('#quick-log-carbs').value || 0),
        fat: Number(document.querySelector('#quick-log-fat').value || 0),
      },
    ],
    calories: Number(document.querySelector('#quick-log-calories').value || 0),
    protein: Number(document.querySelector('#quick-log-protein').value || 0),
    carbs: Number(document.querySelector('#quick-log-carbs').value || 0),
    fat: Number(document.querySelector('#quick-log-fat').value || 0),
  };

  state.meals.unshift(quickMeal);
  saveMeals();
  render();
  quickLogForm.reset();
  document.querySelector('#quick-log-calories').value = 0;
  document.querySelector('#quick-log-protein').value = 0;
  document.querySelector('#quick-log-carbs').value = 0;
  document.querySelector('#quick-log-fat').value = 0;
  document.querySelector('#quick-log-name').focus();
});

goalsForm.addEventListener('submit', (event) => {
  event.preventDefault();

  state.goals = {
    calories: Number(document.querySelector('#goal-calories').value || 0),
    protein: Number(document.querySelector('#goal-protein').value || 0),
    carbs: Number(document.querySelector('#goal-carbs').value || 0),
    fat: Number(document.querySelector('#goal-fat').value || 0),
  };

  saveGoals();
  render();
});

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();

  saveProfileForm();

  if (state.profile.goal === 'custom') {
    state.goals = {
      calories: Number(document.querySelector('#goal-calories').value || state.goals.calories || 2200),
      protein: Number(document.querySelector('#goal-protein').value || state.goals.protein || 160),
      carbs: Number(document.querySelector('#goal-carbs').value || state.goals.carbs || 250),
      fat: Number(document.querySelector('#goal-fat').value || state.goals.fat || 70),
    };
  } else {
    state.goals = getRecommendedGoals(state.profile, state.profile.goal);
  }

  saveGoals();
  renderGoalInputs();
  renderRecommendedSummary();
  renderBodyStatus();
  render();
});

clearButton.addEventListener('click', () => {
  state.meals = [];
  saveMeals();
  render();
});

foodListEl.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.delete-button');
  if (!deleteButton) return;

  const index = Number(deleteButton.dataset.index);
  state.meals.splice(index, 1);
  saveMeals();
  render();
});

mealItemsContainer.addEventListener('input', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  if (Number.isNaN(index) || !field) return;

  mealItems[index][field] = field === 'name' ? target.value : Number(target.value || 0);
});

mealItemsContainer.addEventListener('click', (event) => {
  const removeButton = event.target.closest('.remove-meal-item');
  if (!removeButton) return;

  const index = Number(removeButton.dataset.index);
  mealItems.splice(index, 1);

  if (!mealItems.length) {
    mealItems.push(createMealItem());
  }

  renderMealItems();
});

addMealItemButton.addEventListener('click', () => {
  addMealItemRow();
});

document.querySelector('#account-units').addEventListener('change', () => {
  const units = document.querySelector('#account-units').value;
  const weightField = document.querySelector('#account-weight');
  const heightField = document.querySelector('#account-height');

  const currentWeight = Number(weightField.value || 0);
  const currentHeight = Number(heightField.value || 0);

  if (units === 'imperial') {
    weightField.value = currentWeight ? Number((currentWeight * 2.20462).toFixed(1)) : isDesktopApp ? 0 : 165;
    heightField.value = currentHeight ? Number((currentHeight / 2.54).toFixed(1)) : isDesktopApp ? 0 : 70;
  } else {
    weightField.value = currentWeight ? Number((currentWeight / 2.20462).toFixed(1)) : isDesktopApp ? 0 : 75;
    heightField.value = currentHeight ? Number((currentHeight * 2.54).toFixed(1)) : isDesktopApp ? 0 : 178;
  }

  updateWeightHeightLabels();
});

heightFeetEl.addEventListener('input', () => {
  heightFieldFromImperialInputs();
});

heightInchesEl.addEventListener('input', () => {
  heightFieldFromImperialInputs();
});

function heightFieldFromImperialInputs() {
  if (!isDesktopApp || document.querySelector('#account-units').value !== 'imperial') return;
  document.querySelector('#account-height').value = Number(heightFeetEl.value || 0) * 12 + Number(heightInchesEl.value || 0);
}

renderGoalInputs();
renderProfileInputs();
renderRecommendedSummary();
renderBodyStatus();
render();
renderMealItems();
setAuthenticatedUI();

if (authSession?.access_token) {
  pullFromCloud()
    .then(() => {
      renderProfileInputs();
      renderGoalInputs();
      renderRecommendedSummary();
      renderBodyStatus();
      render();
    })
    .catch((error) => setSyncStatus(`Sync error: ${error.message}`));
}
