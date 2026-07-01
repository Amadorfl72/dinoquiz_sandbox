import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(ResultsActivity::class.java)

    @Test
    fun volverAJugarButton_hasMinimumHeightOf48dp() {
        onView(withText("Volver a jugar"))
            .check(matches(hasMinimumHeight(48)))
    }

    private fun hasMinimumHeight(minHeightDp: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun matchesSafely(view: View): Boolean {
                val density = view.resources.displayMetrics.density
                val minHeightPx = (minHeightDp * density + 0.5f).toInt()
                return view.height >= minHeightPx
            }

            override fun describeTo(description: Description) {
                description.appendText("view height should be at least $minHeightDp dp")
            }
        }
    }
}