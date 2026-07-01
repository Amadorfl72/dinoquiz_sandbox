import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.espresso.action.ViewActions;

import org.junit.Test;
import org.junit.runner.RunWith;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.isFocusable;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static org.junit.Assert.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

@RunWith(AndroidJUnit4.class)
public class HomeScreenUiTest {

    @Test
    public void test_dinosaur_mascot_illustration_displayed() {
        ActivityScenario.launch(HomeActivity.class);
        onView(withId(R.id.dino_mascot)).check(matches(isDisplayed()));
    }

    @Test
    public void test_button_height_minimum_64dp() {
        ActivityScenario.launch(HomeActivity.class);
        onView(withText("¡Jugar!")).check((view, e) -> {
            int heightInDp = Math.round(view.getHeight() / view.getResources().getDisplayMetrics().density);
            assertThat(heightInDp, greaterThanOrEqualTo(64));
        });
    }

    @Test
    public void test_keyboard_navigation_focusable() {
        ActivityScenario.launch(HomeActivity.class);
        onView(withText("¡Jugar!")).check(matches(isFocusable()));
    }
}