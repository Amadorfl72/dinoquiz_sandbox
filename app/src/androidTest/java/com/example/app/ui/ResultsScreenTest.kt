package com.example.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testVolverAJugarButtonHeight() {
        composeTestRule.setContent {
            ResultsScreen()
        }

        val button = composeTestRule.onNodeWithText("Volver a Jugar")
        button.assertIsDisplayed()

        val bounds = button.fetchSemanticsNode().boundsInWindow
        val heightInPx = bounds.height
        val density = composeTestRule.density.density
        val heightInDp = heightInPx / density

        assertTrue(
            "Expected button height to be at least 48dp, but was ${heightInDp}dp",
            heightInDp >= 48f
        )
    }
}
