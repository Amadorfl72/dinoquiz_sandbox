package com.example.app.homescreen

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.example.app.R
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenUiTest {

    @Test
    fun test_button_height_accessibility() {
        ActivityScenario.launch(HomeActivity::class.java).use {
            val button = onView(withId(R.id.home_primary_button))
            
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val density = context.resources.displayMetrics.density
            val minHeightPx = (64 * density).toInt()
            
            button.check { view, noViewFoundException ->
                if (noViewFoundException != null) {
                    throw noViewFoundException
                }
                
                val actualHeight = view.height
                val actualHeightDp = (actualHeight / density).toInt()
                
                assertTrue(
                    "Expected button height to be at least 64dp, but was ${actualHeightDp}dp",
                    actualHeight >= minHeightPx
                )
            }
        }
    }
}
