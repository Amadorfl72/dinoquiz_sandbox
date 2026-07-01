import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;

import com.example.app.R;
import com.example.app.QuestionActivity;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withId;

@RunWith(AndroidJUnit4.class)
public class QuestionScreenTest {

    @Rule
    public ActivityTestRule<QuestionActivity> activityRule = new ActivityTestRule<>(QuestionActivity.class);

    @Test
    public void test_answer_option_buttons_have_minimum_touch_target() {
        // Verify that the answer option buttons are displayed
        onView(withId(R.id.answer_option_button_1)).check(matches(isDisplayed()));
        onView(withId(R.id.answer_option_button_2)).check(matches(isDisplayed()));
        onView(withId(R.id.answer_option_button_3)).check(matches(isDisplayed()));
        onView(withId(R.id.answer_option_button_4)).check(matches(isDisplayed()));

        // Verify that each button has a minimum touch target of 48x48dp
        onView(withId(R.id.answer_option_button_1)).check(matches(MinimumSizeMatcher.hasMinimumSizeDp(48, 48)));
        onView(withId(R.id.answer_option_button_2)).check(matches(MinimumSizeMatcher.hasMinimumSizeDp(48, 48)));
        onView(withId(R.id.answer_option_button_3)).check(matches(MinimumSizeMatcher.hasMinimumSizeDp(48, 48)));
        onView(withId(R.id.answer_option_button_4)).check(matches(MinimumSizeMatcher.hasMinimumSizeDp(48, 48)));
    }
}