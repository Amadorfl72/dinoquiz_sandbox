package com.triofsnd.ui

import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTest {

    @Test
    fun testVolverAJugarButtonHeight() {
        ActivityScenario.launch(ResultsActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val button = activity.findViewById<android.widget.Button>(R.id.btnVolverAJugar)
                val density = activity.resources.displayMetrics.density
                
                // Convert actual pixel height to dp
                val actualHeightDp = button.height / density
                val expectedMinHeightDp = 48
                
                assertTrue(
                    "Expected button height to be at least ${expectedMinHeightDp}dp, but was ${actualHeightDp}dp",
                    actualHeightDp >= expectedMinHeightDp
                )
            }
        }
    }
}